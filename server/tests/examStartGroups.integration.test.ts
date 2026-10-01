// تست یکپارچه‌ی چک عضویتِ گروه داخل تراکنشِ start روی *Postgres واقعی*.
// اجرا: `docker compose up -d postgres` + `npx prisma migrate deploy` و بعد
// `npm test`. اگه دیتابیس در دسترس نباشه تست‌ها skip می‌شن.
//
// سناریو: دانشجو با allowed=true (محاسبه‌شده قبل از تراکنش) وارد start می‌شه،
// ولی مدرس هم‌زمان گروه‌های آزمون رو عوض می‌کنه. reader بعد از گرفتن
// FOR SHARE باید نتیجه‌ی *بعد از commit* تغییر گروه رو ببینه (false)، نه مجوز کهنه.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { prisma } from '../src/lib/prisma';
import { isStudentInExamGroups } from '../src/lib/examAccess';
import { lockExamForShare, withExamWriteLock } from '../src/lib/examLock';
import { unavailable } from './helpers/serviceGuard';

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
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function setup() {
  const s = crypto.randomUUID();
  const instructor = await prisma.user.create({
    data: { email: `start-test-i-${s}@example.test`, role: 'Instructor' },
  });
  const student = await prisma.user.create({
    data: { email: `start-test-s-${s}@example.test`, role: 'Student' },
  });
  const groupA = await prisma.group.create({
    data: {
      name: 'A',
      category: 'test',
      joinCode: `A-${s}`,
      instructorId: instructor.id,
      students: { connect: { id: student.id } },
    },
  });
  const groupB = await prisma.group.create({
    data: {
      name: 'B',
      category: 'test',
      joinCode: `B-${s}`,
      instructorId: instructor.id,
    },
  });
  const exam = await prisma.exam.create({
    data: {
      title: 'start-groups-test',
      category: 'test',
      scheduledAt: new Date(Date.now() - 60_000),
      durationMinutes: 30,
      status: 'Published',
      instructorId: instructor.id,
      groups: { connect: [{ id: groupA.id }] },
    },
  });
  return { instructor, student, groupA, groupB, exam };
}

async function cleanup(ctx: Awaited<ReturnType<typeof setup>>) {
  await prisma.exam.deleteMany({ where: { id: ctx.exam.id } });
  await prisma.group.deleteMany({
    where: { id: { in: [ctx.groupA.id, ctx.groupB.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [ctx.instructor.id, ctx.student.id] } },
  });
}

test('isStudentInExamGroups: عضو گروه آزمون true، بعد از تغییر گروه false', async (t) => {
  if (!dbAvailable) return unavailable(t, 'دیتابیس در دسترس نیست');
  const ctx = await setup();
  try {
    assert.equal(
      await prisma.$transaction((tx) =>
        isStudentInExamGroups(tx, ctx.exam.id, ctx.student.id)
      ),
      true
    );

    await prisma.exam.update({
      where: { id: ctx.exam.id },
      data: { groups: { set: [{ id: ctx.groupB.id }] } },
    });

    assert.equal(
      await prisma.$transaction((tx) =>
        isStudentInExamGroups(tx, ctx.exam.id, ctx.student.id)
      ),
      false
    );
  } finally {
    await cleanup(ctx);
  }
});

test('start هم‌زمان با تغییر گروه‌ها: بعد از FOR SHARE مجوز کهنه دیده نمی‌شه', async (t) => {
  if (!dbAvailable) return unavailable(t, 'دیتابیس در دسترس نیست');
  const ctx = await setup();
  try {
    const writerHasLock = deferred();
    const releaseWriter = deferred();

    // مدرس: گروه‌ها رو عوض می‌کنه و commit رو نگه می‌داره
    const writer = withExamWriteLock(ctx.exam.id, async (tx) => {
      await tx.exam.update({
        where: { id: ctx.exam.id },
        data: { groups: { set: [{ id: ctx.groupB.id }] } },
      });
      writerHasLock.resolve();
      await releaseWriter.promise;
    });
    await writerHasLock.promise;

    // دانشجو: مثل /start، اول قفل مشترک بعد چک عضویت (پشت writer منتظر می‌مونه)
    const reader = prisma.$transaction(async (tx) => {
      await lockExamForShare(tx, ctx.exam.id);
      return isStudentInExamGroups(tx, ctx.exam.id, ctx.student.id);
    });

    await sleep(300);
    releaseWriter.resolve();
    await writer;

    assert.equal(await reader, false);
  } finally {
    await cleanup(ctx);
  }
});