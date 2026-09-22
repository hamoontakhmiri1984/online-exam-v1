// تست یکپارچه‌ی تسویه‌ی هم‌زمان پرداخت روی *Postgres واقعی*.
// اجرا: `docker compose up -d postgres redis` + `npx prisma migrate deploy` و بعد
// `npm test`. اگه دیتابیس در دسترس نباشه تست‌ها skip می‌شن (مثل تست نشست).
//
// زرین‌پال با جایگزین‌کردنِ global fetch شبیه‌سازی می‌شه؛ هیچ درخواستِ واقعی
// به بیرون نمی‌ره.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import {
  handlePaymentCallback,
  refundPayment,
} from '../src/lib/payments';

const DAY_MS = 24 * 60 * 60 * 1000;
const GOLD_DAYS = 30;

let dbAvailable = false;
const realFetch = globalThis.fetch;

before(async () => {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('db timeout')), 3000);
      }),
    ]);
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  } finally {
    clearTimeout(timer);
  }

  // verify زرین‌پال: همیشه «تایید شد» (کد ۱۰۰) با ref_id ثابت
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ data: { code: 100, ref_id: 12345 }, errors: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;
});

after(async () => {
  globalThis.fetch = realFetch;
  await prisma.$disconnect().catch(() => undefined);
  await redis.disconnect().catch(() => undefined);
});

async function createInstructorWithPendingGold(paymentCount: number) {
  const suffix = crypto.randomUUID();
  const instructor = await prisma.user.create({
    data: { email: `pay-test-${suffix}@example.test`, role: 'Instructor' },
  });
  const authorities = Array.from(
    { length: paymentCount },
    (_, i) => `TEST-${suffix}-${i}`
  );
  for (const authority of authorities) {
    await prisma.payment.create({
      data: {
        instructorId: instructor.id,
        planId: 'gold',
        amount: 99000,
        authority,
        status: 'Pending',
      },
    });
  }
  return { instructor, authorities };
}

async function cleanup(instructorId: string) {
  await prisma.payment.deleteMany({ where: { instructorId } });
  await prisma.subscription.deleteMany({ where: { instructorId } });
  await prisma.user.delete({ where: { id: instructorId } }).catch(() => undefined);
}

test('دو پرداختِ هم‌زمانِ یه مدرس برای یه پلن: هر دو ماه حساب می‌شن (۶۰ روز)', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const { instructor, authorities } = await createInstructorWithPendingGold(2);
  try {
    const startedAt = Date.now();
    const results = await Promise.all(
      authorities.map((authority) =>
        handlePaymentCallback({ authority, status: 'OK' })
      )
    );
    assert.deepEqual(results, ['success', 'success']);

    const subs = await prisma.subscription.findMany({
      where: { instructorId: instructor.id },
      orderBy: { endDate: 'desc' },
    });
    assert.equal(subs.length, 2);

    // بدون قفل هر دو از «الان» شروع می‌کردن و بیشینه‌ی endDate فقط ~۳۰ روز بود
    const latestEnd = subs[0].endDate!.getTime();
    const expected = startedAt + 2 * GOLD_DAYS * DAY_MS;
    assert.ok(
      Math.abs(latestEnd - expected) < 60_000,
      `endDate باید ~۶۰ روز بعد باشه، نه ${(latestEnd - startedAt) / DAY_MS} روز`
    );
  } finally {
    await cleanup(instructor.id);
  }
});

test('callback تکراریِ یه authority فقط یک اشتراک می‌سازه', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const { instructor, authorities } = await createInstructorWithPendingGold(1);
  try {
    const [authority] = authorities;
    const results = await Promise.all([
      handlePaymentCallback({ authority, status: 'OK' }),
      handlePaymentCallback({ authority, status: 'OK' }),
      handlePaymentCallback({ authority, status: 'OK' }),
    ]);
    assert.ok(results.every((r) => r === 'success'));
    const subs = await prisma.subscription.count({
      where: { instructorId: instructor.id },
    });
    assert.equal(subs, 1);
  } finally {
    await cleanup(instructor.id);
  }
});

test('استرداد هم‌زمان با تسویه‌ی پرداخت بعدی deadlock نمی‌کنه', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const { instructor, authorities } = await createInstructorWithPendingGold(2);
  try {
    assert.equal(
      await handlePaymentCallback({ authority: authorities[0], status: 'OK' }),
      'success'
    );
    const first = await prisma.payment.findUniqueOrThrow({
      where: { authority: authorities[0] },
    });

    const [refunded, settled] = await Promise.all([
      refundPayment(first.id),
      handlePaymentCallback({ authority: authorities[1], status: 'OK' }),
    ]);
    assert.equal(refunded.status, 'Refunded');
    assert.equal(settled, 'success');
  } finally {
    await cleanup(instructor.id);
  }
});
