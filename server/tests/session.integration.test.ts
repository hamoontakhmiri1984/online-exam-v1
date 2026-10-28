// تست یکپارچه‌ی rotate نشست روی *Redis واقعی* (همون اسکریپت Lua ی production).
// اجرا: Redis رو بالا بیار (docker compose up -d redis) و `npm test`.
// اگه به Redis وصل نشد، تست‌ها skip می‌شن.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { redis } from '../src/lib/redis';
import { waitForRedis } from '../src/lib/redisConnection';
import { AppError } from '../src/lib/errors';
import {
  createSession,
  isSessionValid,
  VALIDATE_SESSION_SCRIPT,
  revokeSession,
  rotateSessionWithGrace,
  withSessionStore,
} from '../src/lib/session';
import { unavailable } from './helpers/serviceGuard';

let redisAvailable = false;

before(async () => {
  try {
    // The production client deliberately rejects commands before readiness.
    // Wait for the connection and PONG instead of treating startup as an outage.
    await waitForRedis(redis);
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
});

after(() => {
  if (redis.isOpen) redis.destroy();
});

const newUserId = () => `test-user-${crypto.randomUUID()}`;

test('validate Lua is read-only and resolves aliases through declared keys', () => {
  assert.doesNotMatch(
    VALIDATE_SESSION_SCRIPT,
    /redis\.call\('(GET|ZREMRANGEBYSCORE|ZREM|SET|DEL|HSET|HDEL|ZADD|EXPIRE)'/,
  );
  assert.match(VALIDATE_SESSION_SCRIPT, /redis\.call\('HGET', KEYS\[2\], current\)/);
  assert.doesNotMatch(VALIDATE_SESSION_SCRIPT, /ARGV\[.*\] \.\./);
});


test('دو refresh هم‌زمان با یک sid قدیمی، هر دو همون sid جدید رو می‌گیرن', async (t) => {
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
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
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
  const userId = newUserId();
  try {
    await createSession(userId);
    assert.equal(await rotateSessionWithGrace(userId, 'not-a-real-sid'), null);
  } finally {
    await revokeSession(userId);
  }
});

test('ورود از دستگاه دوم، نشست اول را حفظ می‌کند', async (t) => {
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
  const userId = newUserId();
  try {
    const first = await createSession(userId);
    const rotated = await rotateSessionWithGrace(userId, first);
    assert.ok(rotated);
    const secondDevice = await createSession(userId);

    assert.equal(await isSessionValid(userId, first), true);
    assert.equal(await isSessionValid(userId, rotated!), true);
    assert.equal(await isSessionValid(userId, secondDevice), true);
    assert.equal(await rotateSessionWithGrace(userId, first), rotated);
  } finally {
    await revokeSession(userId);
  }
});

test('حداکثر پنج نشست فعال برای هر کاربر نگه داشته می‌شود', async (t) => {
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
  const userId = newUserId();
  try {
    const sessions: string[] = [];
    for (let i = 0; i < 6; i++) sessions.push(await createSession(userId));

    assert.equal(await isSessionValid(userId, sessions[0]), false);
    for (const sid of sessions.slice(1)) {
      assert.equal(await isSessionValid(userId, sid), true);
    }
  } finally {
    await revokeSession(userId);
  }
});

test('بعد از logout هیچ sid ای معتبر یا قابل rotate نیست', async (t) => {
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
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
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
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

test('ورود جدید و refresh هم‌زمان، دو نشست مستقل را حفظ می‌کنند', async (t) => {
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
  for (let i = 0; i < 50; i++) {
    const userId = newUserId();
    try {
      const oldSession = await createSession(userId);
      const [newLogin, rotated] = await Promise.all([
        createSession(userId),
        rotateSessionWithGrace(userId, oldSession),
      ]);
      assert.ok(rotated);
      assert.equal(await isSessionValid(userId, newLogin), true);
      assert.equal(await isSessionValid(userId, rotated!), true);
      assert.equal(await isSessionValid(userId, oldSession), true);
    } finally {
      await revokeSession(userId);
    }
  }
});

test('logout هم‌زمان با refresh: بعد از logout هیچ sid ای معتبر نمی‌مونه', async (t) => {
  if (!redisAvailable) return unavailable(t, 'Redis در دسترس نیست');
  for (let i = 0; i < 50; i++) {
    const userId = newUserId();
    const s0 = await createSession(userId);
    const [, rotated] = await Promise.all([
      revokeSession(userId),
      rotateSessionWithGrace(userId, s0),
    ]);
    assert.equal(await isSessionValid(userId, s0), false);
    if (rotated) assert.equal(await isSessionValid(userId, rotated), false);
    assert.equal(await rotateSessionWithGrace(userId, s0), null);
  }
});

// این دو تست به Redis نیاز ندارن: فقط تبدیل شکستِ مخزن نشست به ۵۰۳ رو چک می‌کنن
test('withSessionStore: خطای مخزن نشست ۵۰۳ می‌شه، نه یه خطای عمومی/۴۰۱', async () => {
  await assert.rejects(
    withSessionStore(async () => {
      throw new Error('ECONNREFUSED');
    }),
    (e: unknown) => e instanceof AppError && e.statusCode === 503,
  );
});

test('withSessionStore: درخواست معلق (Redis قطع) بعد از timeout ۵۰۳ می‌شه', async () => {
  await assert.rejects(
    withSessionStore(() => new Promise<never>(() => undefined)),
    (e: unknown) => e instanceof AppError && e.statusCode === 503,
  );
});
