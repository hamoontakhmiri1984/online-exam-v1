import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { accessiblePractice } from './practice.access';

type Input = { requestId: string; selectedOptionIndex: number };
export async function answerPractice(
  practiceId: string,
  questionId: string,
  studentId: string,
  input: Input,
) {
  // Parallel learners share the lock; archive/content changes take FOR UPDATE.
  // The student row serializes retries from multiple tabs before checking requestId.
  return prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM users WHERE id = ${studentId} FOR UPDATE`;
    await db.$queryRaw`SELECT id FROM practice_sets WHERE id = ${practiceId} FOR SHARE`;
    await accessiblePractice(db, practiceId, {
      sub: studentId,
      role: 'Student',
    });
    const q = await db.practiceQuestion.findFirst({
      where: { id: questionId, practiceId },
    });
    if (!q) throw notFound('سؤال در این تمرین یافت نشد.');
    if (input.selectedOptionIndex >= q.options.length)
      throw badRequest('گزینه نامعتبر است.');
    const existing = await db.practiceAttempt.findUnique({
      where: { studentId_requestId: { studentId, requestId: input.requestId } },
    });
    if (
      existing &&
      (existing.questionId !== questionId ||
        existing.selectedOptionIndex !== input.selectedOptionIndex)
    )
      throw conflict('شناسهٔ این تلاش قبلاً برای پاسخ دیگری استفاده شده است.');
    const attempt =
      existing ??
      (await db.practiceAttempt.create({
        data: {
          studentId,
          questionId,
          requestId: input.requestId,
          selectedOptionIndex: input.selectedOptionIndex,
          isCorrect: input.selectedOptionIndex === q.correctOptionIndex,
        },
      }));
    const stats = await questionStats(db, studentId, [questionId]);
    return {
      id: attempt.id,
      questionId,
      selectedOptionIndex: attempt.selectedOptionIndex,
      isCorrect: attempt.isCorrect,
      correctOptionIndex: q.correctOptionIndex,
      createdAt: attempt.createdAt,
      stats: stats[questionId],
    };
  });
}
export type PracticeStats = {
  attempts: number;
  correct: number;
  incorrect: number;
  lastCorrect: boolean | null;
  lastAttemptAt: Date | null;
};
export async function questionStats(
  db: Prisma.TransactionClient,
  studentId: string,
  ids: string[],
) {
  const stats: Record<string, PracticeStats> = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        attempts: 0,
        correct: 0,
        incorrect: 0,
        lastCorrect: null,
        lastAttemptAt: null,
      },
    ]),
  );
  if (!ids.length) return stats;
  const where = { studentId, questionId: { in: ids } };
  const counts = await db.practiceAttempt.groupBy({
    by: ['questionId', 'isCorrect'],
    where,
    _count: { _all: true },
  });
  for (const row of counts) {
    stats[row.questionId].attempts += row._count._all;
    stats[row.questionId][row.isCorrect ? 'correct' : 'incorrect'] +=
      row._count._all;
  }
  const latest = await db.$queryRaw<
    { questionId: string; isCorrect: boolean; createdAt: Date }[]
  >`
    SELECT DISTINCT ON ("questionId") "questionId", "isCorrect", "createdAt"
    FROM practice_attempts WHERE "studentId" = ${studentId}
    AND "questionId" IN (${Prisma.join(ids)})
    ORDER BY "questionId", "createdAt" DESC, id DESC`;
  for (const row of latest) {
    stats[row.questionId].lastCorrect = row.isCorrect;
    stats[row.questionId].lastAttemptAt = row.createdAt;
  }
  return stats;
}
