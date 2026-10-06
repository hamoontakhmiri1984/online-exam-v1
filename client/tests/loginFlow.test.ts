import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import OtpStep from '../src/components/SignupForm/OtpStep';
import OtpVerifyForm from '../src/components/LoginForm/OtpVerifyForm';
import { validateIdentityField } from '../src/components/SignupForm/signup.validation';
import {
  normalizeIdentifier,
  detectIdentifierType,
} from '../src/utils/identifier';
import { googleLogin } from '../src/api/authApi';

test('signup OTP disables all input/actions while verification or resend is in flight', () => {
  for (const busy of [
    { loading: true, resending: false },
    { loading: false, resending: true },
  ]) {
    const html = renderToString(
      createElement(OtpStep, {
        identifier: 'user@example.com',
        code: '123456',
        error: '',
        resendSignal: 0,
        onCodeChange() {},
        onBack() {},
        onResend() {},
        onSubmit() {},
        ...busy,
      }),
    );
    const controls = html.match(/<(?:button|input)\b[^>]*>/g) ?? [];
    assert.equal(controls.length, 9);
    assert.ok(controls.every((tag) => tag.includes('disabled')));
  }
});
test('OTP fields are labelled, support full-code autofill and fit narrow screens', () => {
  const html = renderToString(
    createElement(
      MemoryRouter,
      {},
      createElement(OtpVerifyForm, {
        identifier: 'user@example.com',
        rememberMe: false,
        onSuccess() {},
        onEdit() {},
        onPassword() {},
        sent: true,
        sending: false,
        cooldown: 90,
        sendError: '',
        onResend() {},
      }),
    ),
  );
  assert.equal((html.match(/aria-label="رقم/g) ?? []).length, 6);
  assert.ok(html.includes('maxLength="6"'));
  assert.ok(html.includes('min-w-0'));
});
test('identifier normalization and signup/reset password limits match supported inputs', () => {
  const phone = '+۹۸۹۱۲۳۴۵۶۷۸۹';
  assert.equal(detectIdentifierType(phone), 'PHONE');
  assert.equal(normalizeIdentifier(phone, 'PHONE'), '09123456789');
  assert.equal(
    normalizeIdentifier(' User@Example.com ', 'EMAIL'),
    'user@example.com',
  );
  const values = {
    name: 'Ali',
    identifier: 'u@example.com',
    password: 'abc123',
    confirmPassword: 'abc123',
  };
  assert.equal(validateIdentityField('password', values), null);
  for (const password of ['123456', 'abcdef', 'a1'.repeat(37)])
    assert.ok(validateIdentityField('password', { ...values, password }));
});
test('Google account creation is explicit and pending approval does not create a client session', async () => {
  const original = globalThis.fetch;
  const requests: unknown[] = [];
  globalThis.fetch = (async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify(
        requests.length === 1
          ? { registrationRequired: true }
          : { pendingApproval: true, message: 'منتظر تأیید' },
      ),
      { status: 200 },
    );
  }) as typeof fetch;
  try {
    assert.equal((await googleLogin('token')).status, 'registration_required');
    assert.equal(
      (await googleLogin('token', { role: 'Instructor', name: 'Teacher' }))
        .status,
      'pending_approval',
    );
    assert.deepEqual(requests, [
      { idToken: 'token' },
      {
        idToken: 'token',
        registration: { role: 'Instructor', name: 'Teacher' },
      },
    ]);
  } finally {
    globalThis.fetch = original;
  }
});

test('unsent OTP shows retry and edit without claiming delivery or accepting a code', () => {
  const html = renderToString(
    createElement(OtpVerifyForm, {
      identifier: '09123456789',
      rememberMe: false,
      onSuccess() {},
      onEdit() {},
      onPassword() {},
      sent: false,
      sending: false,
      cooldown: 0,
      sendError: 'سرویس در دسترس نیست',
      onResend() {},
    }),
  );
  assert.ok(html.includes('کد هنوز ارسال نشده'));
  assert.ok(html.includes('ویرایش'));
  assert.ok(html.includes('ورود با رمز عبور'));
  assert.ok(!html.includes('one-time-code'));
});

test('OTP send in flight disables edit, resend, verification and method switching', () => {
  const html = renderToString(
    createElement(OtpVerifyForm, {
      identifier: 'user@example.com',
      rememberMe: false,
      onSuccess() {},
      onEdit() {},
      onPassword() {},
      sent: true,
      sending: true,
      cooldown: 0,
      sendError: '',
      onResend() {},
    }),
  );
  const controls = html.match(/<(?:button|input)\b[^>]*>/g) ?? [];
  assert.equal(controls.length, 10);
  assert.ok(controls.every((tag) => tag.includes('disabled')));
});
