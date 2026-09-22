import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDeadlineLocalMs,
  remainingSecondsUntil,
} from '../src/hooks/useExamRunner/examClock';

// سرور ساعت ۱۰:۰۰:۰۰ ـه و آزمون تا ۱۰:۳۰:۰۰ (۳۰ دقیقه‌ی دیگه)
const SERVER_NOW = '2026-09-21T10:00:00.000Z';
const EXPIRES_AT = '2026-09-21T10:30:00.000Z';
const serverNowMs = Date.parse(SERVER_NOW);

function remainingFor(deviceSkewMs: number, rttMs = 0) {
  // ساعت دستگاه = ساعت واقعی + skew
  const sent = serverNowMs + deviceSkewMs - rttMs / 2;
  const received = serverNowMs + deviceSkewMs + rttMs / 2;
  const deadline = computeDeadlineLocalMs({
    expiresAt: EXPIRES_AT,
    serverNow: SERVER_NOW,
    requestStartedAtMs: sent,
    responseReceivedAtMs: received,
  });
  assert.notEqual(deadline, null);
  // «الان» = لحظه‌ی دریافت پاسخ (روی ساعت دستگاه)
  return remainingSecondsUntil(deadline!, received);
}

test('ساعت دستگاه درسته: ۳۰ دقیقه', () => {
  assert.equal(remainingFor(0), 30 * 60);
});

test('دستگاه ۵ دقیقه عقبه: باز هم ۳۰ دقیقه (نه ۳۵)', () => {
  assert.equal(remainingFor(-5 * 60_000), 30 * 60);
});

test('دستگاه ۵ دقیقه جلوئه: باز هم ۳۰ دقیقه (نه ۲۵)', () => {
  assert.equal(remainingFor(5 * 60_000), 30 * 60);
});

test('تأخیر شبکه‌ی متقارن: خطا نداره؛ فقط زمانی که واقعاً گذشته کم می‌شه', () => {
  // رفت‌وبرگشت ۲ ثانیه؛ پاسخ ۱ ثانیه بعد از ساخته‌شدنِ serverNow رسیده
  assert.equal(remainingFor(0, 2000), 30 * 60 - 1);
  // همین با ساعتِ غلط هم فرقی نمی‌کنه
  assert.equal(remainingFor(-5 * 60_000, 2000), 30 * 60 - 1);
});

test('بعد از موعد، باقی‌مونده صفره نه منفی', () => {
  const deadline = computeDeadlineLocalMs({
    expiresAt: EXPIRES_AT,
    serverNow: SERVER_NOW,
    requestStartedAtMs: serverNowMs,
    responseReceivedAtMs: serverNowMs,
  });
  assert.equal(remainingSecondsUntil(deadline!, serverNowMs + 3_600_000), 0);
});

test('ورودی نامعتبر یا ساعتِ محلیِ جابه‌جاشده: null (بازگشت به رفتار قبلی)', () => {
  assert.equal(
    computeDeadlineLocalMs({
      expiresAt: EXPIRES_AT,
      serverNow: 'garbage',
      requestStartedAtMs: 1,
      responseReceivedAtMs: 2,
    }),
    null
  );
  assert.equal(
    computeDeadlineLocalMs({
      expiresAt: EXPIRES_AT,
      serverNow: SERVER_NOW,
      requestStartedAtMs: 5000,
      responseReceivedAtMs: 1000,
    }),
    null
  );
});
