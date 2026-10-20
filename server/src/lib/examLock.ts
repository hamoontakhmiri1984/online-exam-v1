import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { notFound } from './errors';

type Tx = Prisma.TransactionClient;

// Exam edits take FOR UPDATE; starts take FOR SHARE on the same row.

export type LockedExamRow = {
  id: string;
  status: 'Draft' | 'Published';
  scheduledAt: Date;
  durationMinutes: number;
};

// Use the exam values read under the lock, not a pre-lock snapshot.
export async function lockExamForShare(
  tx: Tx,
  examId: string
): Promise<LockedExamRow> {
  const rows = await tx.$queryRaw<LockedExamRow[]>`
    SELECT "id", "status", "scheduledAt", "durationMinutes"
    FROM "exams" WHERE "id" = ${examId} FOR SHARE
  `;
  if (rows.length === 0) throw notFound('آزمون یافت نشد');
  return rows[0];
}

export async function lockExamForUpdate(
  tx: Tx,
  examId: string
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "exams" WHERE "id" = ${examId} FOR UPDATE
  `;
  if (rows.length === 0) throw notFound('آزمون یافت نشد');
}

// Check attempts under the exam lock. Lock order is instructor, then exam.
export async function withExamWriteLock<T>(
  examId: string,
  run: (tx: Tx, ctx: { attemptCount: number }) => Promise<T>,
  opts: { beforeExamLock?: (tx: Tx) => Promise<void> } = {}
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await opts.beforeExamLock?.(tx);
    await lockExamForUpdate(tx, examId);
    const attemptCount = await tx.examAttempt.count({ where: { examId } });
    return run(tx, { attemptCount });
  });
}
