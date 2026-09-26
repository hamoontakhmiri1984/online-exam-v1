// تست یکپارچه‌ی اعمالِ اتمیکِ سهمیه‌ی پلن روی *Postgres واقعی* (lib/quota.ts).
// اجرا: `docker compose up -d postgres redis` + `npx prisma migrate deploy` و بعد
// `npm test`. اگه دیتابیس در دسترس نباشه تست‌ها skip می‌شن.
//
// سناریوی اصلی: N درخواستِ موازیِ «چک سهمیه + ساخت». قبلاً هر N تا چکِ
// «جا هست» رو رد می‌کردن و از سقف پلن می‌گذشتن؛ الان دقیقاً به‌اندازه‌ی سقف
// موفق می‌شن و بقیه ۴۰۳ با reason=limit_reached می‌گیرن.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import { AppError } from '../src/lib/errors';
import {
  prepareQuotaGuard,
  withQuotaLock,
  type QuotaKind,
} from '../src/lib/quota';
import { createExamQuestionsBulk } from '../src/routes/questions/examQuestions.service';

let dbAvailable = false;

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
});

after(async () => {
  await prisma.$disconnect().catch(() => undefined);
  await redis.disconnect().catch(() => undefined);
});

type Outcome = { ok: true } | { ok: false; reason: unknown };

async function settle(tasks: Promise<unknown>[]): Promise<Outcome[]> {
  const results = await Promise.allSettled(tasks);
  return results.map((r) => {
    if (r.status === 'fulfilled') return { ok: true as const };
    const err = r.reason;
    if (err instanceof AppError && err.statusCode === 403) {
      return { ok: false as const, reason: err.details?.reason };
    }
    throw err; // هر خطای دیگه‌ای یعنی باگ (deadlock، تایم‌اوت، ...) نه رد شدنِ سهمیه
  });
}

const count = (outcomes: Outcome[], ok: boolean) =>
  outcomes.filter((o) => o.ok === ok).length;

async function createInstructor(
  plan: { planId: 'free' | 'gold' | 'platinum'; endDate: Date | null } = {
    planId: 'free',
    endDate: null,
  }
) {
  const suffix = crypto.randomUUID();
  const user = await prisma.user.create({
    data: { email: `quota-test-${suffix}@example.test`, role: 'Instructor' },
  });
  // ردیف اشتراک از قبل ساخته می‌شه تا خودِ getCurrentSubscription (که برای
  // مدرسِ بدون ردیف، ردیف «رایگان» می‌سازه) وسط تست race نسازه
  await prisma.subscription.create({
    data: {
      instructorId: user.id,
      planId: plan.planId,
      startDate: new Date(Date.now() - 1000),
      endDate: plan.endDate,
    },
  });
  return user;
}

async function cleanup(instructorId: string) {
  await prisma.handout.deleteMany({ where: { instructorId } });
  const groups = await prisma.group.findMany({
    where: { instructorId },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);
  const exams = await prisma.exam.findMany({
    where: { groups: { some: { id: { in: groupIds } } } },
    select: { id: true },
  });
  await prisma.exam.deleteMany({
    where: { id: { in: exams.map((e) => e.id) } },
  });
  await prisma.group.deleteMany({ where: { instructorId } });
  await prisma.subscription.deleteMany({ where: { instructorId } });
  await prisma.user.delete({ where: { id: instructorId } }).catch(() => undefined);
}

const createGroup = (instructorId: string) =>
  withQuotaLock(instructorId, 'groups', 1, (db) =>
    db.group.create({
      data: {
        name: 'g',
        category: 'c',
        instructorId,
        joinCode: `T${crypto.randomUUID().slice(0, 8)}`,
      },
    })
  );

const createHandout = (instructorId: string) =>
  withQuotaLock(instructorId, 'handouts', 1, (db) =>
    db.handout.create({
      data: {
        title: 't',
        category: 'c',
        instructorId,
        fileName: 'f.pdf',
        fileUrl: `k-${crypto.randomUUID()}`,
        fileSize: 1,
      },
    })
  );

test('پلن رایگان (سقف ۱ گروه): ۸ ساخت هم‌زمان → دقیقاً ۱ موفق', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const user = await createInstructor();
  try {
    const outcomes = await settle(
      Array.from({ length: 8 }, () => createGroup(user.id))
    );
    assert.equal(count(outcomes, true), 1);
    assert.ok(
      outcomes.filter((o) => !o.ok).every((o) => !o.ok && o.reason === 'limit_reached')
    );
    assert.equal(await prisma.group.count({ where: { instructorId: user.id } }), 1);
  } finally {
    await cleanup(user.id);
  }
});

test('پلن رایگان (سقف ۵ جزوه): ۱۵ ساخت هم‌زمان → دقیقاً ۵ موفق', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const user = await createInstructor();
  try {
    const outcomes = await settle(
      Array.from({ length: 15 }, () => createHandout(user.id))
    );
    assert.equal(count(outcomes, true), 5);
    assert.equal(await prisma.handout.count({ where: { instructorId: user.id } }), 5);
  } finally {
    await cleanup(user.id);
  }
});

test('پلن نامحدود: قفل و سقفی نیست، همه‌ی ساخت‌ها موفق', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const user = await createInstructor({ planId: 'platinum', endDate: new Date(Date.now() + 86_400_000) });
  try {
    const outcomes = await settle(
      Array.from({ length: 6 }, () => createGroup(user.id))
    );
    assert.equal(count(outcomes, true), 6);
  } finally {
    await cleanup(user.id);
  }
});

test('پلن منقضی: همه رد می‌شن با reason=plan_expired', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const user = await createInstructor({ planId: 'gold', endDate: new Date(Date.now() - 1000) });
  try {
    const outcomes = await settle(
      Array.from({ length: 3 }, () => createGroup(user.id))
    );
    assert.equal(count(outcomes, true), 0);
    assert.ok(outcomes.every((o) => !o.ok && o.reason === 'plan_expired'));
  } finally {
    await cleanup(user.id);
  }
});

test('سوال آزمون (سقف ۵۰): ۳ ایمپورتِ ۳۰تایی هم‌زمان → فقط یکی جا می‌شه، بدون deadlock', async (t) => {
  if (!dbAvailable) return t.skip('Postgres در دسترس نیست');
  const user = await createInstructor();
  try {
    const group = await prisma.group.create({
      data: {
        name: 'g',
        category: 'c',
        instructorId: user.id,
        joinCode: `T${crypto.randomUUID().slice(0, 8)}`,
      },
    });
    // ۳ آزمونِ جدا: قفل آزمون‌ها با هم تداخل ندارن، پس فقط قفل مدرس
    // (سهمیه‌ی مشترک) این‌ها رو نوبتی می‌کنه
    const exams = await Promise.all(
      [0, 1, 2].map(() =>
        prisma.exam.create({
          data: {
            title: 'e',
            category: 'c',
            scheduledAt: new Date(Date.now() + 86_400_000),
            durationMinutes: 30,
            instructorId: user.id,
            groups: { connect: [{ id: group.id }] },
          },
        })
      )
    );
    const batch = Array.from({ length: 30 }, (_, i) => ({
      text: `q${i}`,
      options: ['a', 'b'],
      correctOptionIndex: 0,
    }));
    const kind: QuotaKind = 'questions';

    const outcomes = await settle(
      exams.map(async (exam) =>
        createExamQuestionsBulk(
          exam.id,
          batch,
          await prepareQuotaGuard(user.id, kind, batch.length)
        )
      )
    );
    assert.equal(count(outcomes, true), 1);
    assert.equal(
      await prisma.examQuestion.count({
        where: { examId: { in: exams.map((e) => e.id) } },
      }),
      30
    );
  } finally {
    await cleanup(user.id);
  }
});