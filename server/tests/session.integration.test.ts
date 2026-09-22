// تست یکپارچه‌ی rotate نشست روی *Redis واقعی* (همون اسکریپت Lua ی production).
// اجرا: Redis رو بالا بیار (docker compose up -d redis) و `npm test`.
// اگه به Redis وصل نشد، تست‌ها skip می‌شن.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { redis } from '../src/lib/redis';
import { AppError } from '../src/lib/errors';
import {
  createSession,
  isSessionValid,
  revokeSession,
  rotateSessionWithGrace,
  withSessionStore,
} from '../src/lib/session';

let redisAvailable = false;

before(async () => {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis timeout')), 3000);
      }),
    ]);
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  } finally {
    clearTimeout(timer);
  }
});

after(async () => {
  // disconnect به‌جای quit: اگه Redis بالا نیومده باشه quit هم معلق می‌مونه
  await redis.disconnect().catch(() => undefined);
});

const newUserId = () => `test-user-${crypto.randomUUID()}`;

test('دو refresh هم‌زمان با یک sid قدیمی، هر دو همون sid جدید رو می‌گیرن', async (t) => {
  if (!redisAvailable) return t.skip('Redis در دسترس نیست');
  const userId = newUserId();
  try {
    const s0 = await createSession(userId);

    const [a, b] = await Promise.all([
      rotateSessionWithGrace(userId, s0),
      rotateSessionWithGrace(userId, s0),
    ]);

    assert.ok(a, 'رفرش اول باید موفق باشه');
    assert.equal(a, b, 'رفرش دوم نباید sid جدید دیگه‌ای بسازه');
    assert.notEqual(a, s0);

    // توکن رفرش اول (و دوم) هنوز معتبره - قبلاً دومی اولی رو باطل می‌کرد
    assert.equal(await isSessionValid(userId, a!), true);
    // sid قدیمی تا پایان grace هنوز معتبره (درخواست‌های در حال پرواز)
    assert.equal(await isSessionValid(userId, s0), true);
  } finally {
    await revokeSession(userId);
  }
});

test('sid ناشناخته/باطل rotate نمی‌شه', async (t) => {
  if (!redisAvailable) return t.skip('Redis در دسترس نیست');
  const userId = newUserId();
  try {
    await createSession(userId);
    assert.equal(await rotateSessionWithGrace(userId, 'not-a-real-sid'), null);
  } finally {
    await revokeSession(userId);
  }
});

test('لاگین واقعی از دستگاه دیگه، sid قدیمی و sid های rotate شده رو فوری باطل می‌کنه', async (t) => {
  if (!redisAvailable) return t.skip('Redis در دسترس نیست');
  const userId = newUserId();
  try {
    const s0 = await createSession(userId);
    const s1 = await rotateSessionWithGrace(userId, s0);
    assert.ok(s1);

    const other = await createSession(userId); // دستگاه دیگه

    assert.equal(await isSessionValid(userId, s0), false);
    assert.equal(await isSessionValid(userId, s1!), false);
    assert.equal(await rotateSessionWithGrace(userId, s0), null);
    assert.equal(await rotateSessionWithGrace(userId, s1!), null);
    assert.equal(await isSessionValid(userId, other), true);
  } finally {
    await revokeSession(userId);
  }
});

test('بعد از logout هیچ sid ای معتبر یا قابل rotate نیست', async (t) => {
  if (!redisAvailable) return t.skip('Redis در دسترس نیست');
  const userId = newUserId();
  const s0 = await createSession(userId);
  const s1 = await rotateSessionWithGrace(userId, s0);
  assert.ok(s1);

  await revokeSession(userId);

  assert.equal(await isSessionValid(userId, s0), false);
  assert.equal(await isSessionValid(userId, s1!), false);
  assert.equal(await rotateSessionWithGrace(userId, s1!), null);
});

test('rotate زنجیره‌ای A→B→C: sid قدیمی A همون sid *فعلی* (C) رو می‌گیره، نه B ی مرده', async (t) => {
  if (!redisAvailable) return t.skip('Redis در دسترس نیست');
  const userId = newUserId();
  try {
    const a = await createSession(userId);
    const b = await rotateSessionWithGrace(userId, a);
    assert.ok(b);
    const c = await rotateSessionWithGrace(userId, b!);
    assert.ok(c);
    assert.notEqual(c, b);

    // یه تبِ عقب‌مانده هنوز با A اومده (تو grace): باید C بگیره
    const late = await rotateSessionWithGrace(userId, a);
    assert.equal(late, c);
    assert.equal(await isSessionValid(userId, late!), true);
  } finally {
    await revokeSession(userId);
  }
});

// این دو تست به Redis نیاز ندارن: فقط تبدیل شکستِ مخزن نشست به ۵۰۳ رو چک می‌کنن
test('withSessionStore: خطای مخزن نشست ۵۰۳ می‌شه، نه یه خطای عمومی/۴۰۱', async () => {
  await assert.rejects(
    withSessionStore(async () => {
      throw new Error('ECONNREFUSED');
    }),
    (e: unknown) => e instanceof AppError && e.statusCode === 503
  );
});

test('withSessionStore: درخواست معلق (Redis قطع) بعد از timeout ۵۰۳ می‌شه', async () => {
  await assert.rejects(
    withSessionStore(() => new Promise<never>(() => undefined)),
    (e: unknown) => e instanceof AppError && e.statusCode === 503
  );
});
