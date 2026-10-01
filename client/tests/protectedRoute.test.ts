import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext, type AuthContextValue } from '../src/context/AuthContext';
import RouteTable from '../src/routes/RouteTable';
import type { RouteConfig } from '../src/routes/routeConfig';
import SessionUnavailable from '../src/components/SessionStatus/SessionUnavailable';
import { resolveAccess } from '../src/components/ProtectedRoute/resolveAccess';
import type { User } from '../src/api/authApi';

const student = { id: 1, role: 'Student', onboardingCompleted: true } as unknown as User;
const admin = { id: 2, role: 'SuperAdmin', onboardingCompleted: true } as unknown as User;
const fresh = { id: 3, role: 'Student', onboardingCompleted: false } as unknown as User;

const Public: ComponentType = () => createElement('main', null, 'PUBLIC_LOGIN_PAGE');
const Secret: ComponentType = () => createElement('main', null, 'SECRET_DASHBOARD');
const table: RouteConfig[] = [
  { path: '/login', Component: Public },
  { path: '/dashboard', Component: Secret, protected: true },
];

function auth(over: Partial<AuthContextValue>): AuthContextValue {
  return { user: null, isAuthenticated: false, isSessionReady: false, isSessionUnavailable: false, retrySession: () => {}, logout: () => {}, ...over };
}
function render(path: string, value: AuthContextValue): string {
  return renderToString(
    createElement(AuthContext.Provider, { value }, createElement(MemoryRouter, { initialEntries: [path] }, createElement(RouteTable, { routeTable: table }))),
  );
}

test('صفحه عمومی در حال loading نشست بلافاصله رندر می‌شود', () => {
  assert.match(render('/login', auth({})), /PUBLIC_LOGIN_PAGE/);
});

test('صفحه عمومی هنگام unavailable بودن نشست رندر می‌شود', () => {
  assert.match(render('/login', auth({ isSessionUnavailable: true })), /PUBLIC_LOGIN_PAGE/);
});

test('مسیر محافظت‌شده هنگام loading اسپینر نشان می‌دهد و محتوا را نه (حتی با user قدیمی)', () => {
  const html = render('/dashboard', auth({ user: student, isAuthenticated: true }));
  assert.match(html, /در حال بارگذاری/);
  assert.doesNotMatch(html, /SECRET_DASHBOARD/);
});

test('مسیر محافظت‌شده هنگام unavailable پیام و دکمه تلاش مجدد دارد و محتوا را نه', () => {
  const html = render('/dashboard', auth({ user: student, isAuthenticated: true, isSessionUnavailable: true }));
  assert.match(html, /تلاش مجدد/);
  assert.doesNotMatch(html, /SECRET_DASHBOARD/);
});

test('دکمه تلاش مجدد به retrySession وصل است', () => {
  let calls = 0;
  const tree = SessionUnavailable({ onRetry: () => { calls += 1; } }) as any;
  const button = [].concat(tree.props.children).find((c: any) => c?.type === 'button') as any;
  button.props.onClick();
  assert.equal(calls, 1);
});

test('پس از تأیید نشست، محتوا فقط برای کاربر لاگین‌شده نمایش داده می‌شود', () => {
  assert.match(render('/dashboard', auth({ user: student, isAuthenticated: true, isSessionReady: true })), /SECRET_DASHBOARD/);
  assert.doesNotMatch(render('/dashboard', auth({ isSessionReady: true })), /SECRET_DASHBOARD/);
});

test('resolveAccess: خطای موقت هرگز redirect به login نیست', () => {
  assert.deepEqual(resolveAccess({ isSessionReady: false, isSessionUnavailable: true, user: null }), { kind: 'unavailable' });
  assert.deepEqual(resolveAccess({ isSessionReady: false, isSessionUnavailable: false, user: null }), { kind: 'loading' });
});

test('resolveAccess: نشست تأییدشده، login/onboarding/نقش حفظ می‌شوند', () => {
  const ready = { isSessionReady: true, isSessionUnavailable: false };
  assert.deepEqual(resolveAccess({ ...ready, user: null }), { kind: 'redirect', to: '/login' });
  assert.deepEqual(resolveAccess({ ...ready, user: fresh }), { kind: 'redirect', to: '/onboarding' });
  assert.deepEqual(resolveAccess({ ...ready, user: fresh, skipOnboardingGate: true }), { kind: 'allow' });
  assert.deepEqual(resolveAccess({ ...ready, user: student, allowedRoles: ['SuperAdmin'] }), { kind: 'redirect', to: '/dashboard' });
  assert.deepEqual(resolveAccess({ ...ready, user: admin, allowedRoles: ['SuperAdmin'] }), { kind: 'allow' });
});