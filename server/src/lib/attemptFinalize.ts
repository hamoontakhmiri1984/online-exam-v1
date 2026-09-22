import type { ExamAttempt } from '@prisma/client';
import { prisma } from './prisma';
import { notifyUser } from './notifications';
import { FINISH_GRACE_MS } from './examTiming';

// ثابتِ مهلت ارسال حالا تو examTiming.ts تعریف می‌شه (تا بدون کشیدنِ prisma
// قابل import و تست باشه)؛ اینجا re-export می‌شه که importهای قبلی نشکنن
export { FINISH_GRACE_MS };

export type AnswersMap = Record<string, number>;

// answers تو دیتابیس Json ـه؛ قبل از نمره‌دادن به یه map سالم تبدیلش می‌کنیم
export function sanitizeAnswers(raw: unknown): AnswersMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: AnswersMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      out[key] = value;
    }
  }
  return out;
}

// finalize اتمیک: فقط اولین کسی که finishedAt رو از null عوض کنه برنده‌ست
// (won: true). درخواست/sweep دوم فقط نتیجه‌ی ثبت‌شده رو می‌بینه (won: false)
// و نباید اعلان دوباره بفرسته
export async function finalizeAttempt(input: {
  attemptId: string;
  examId: string;
  answers: AnswersMap;
  finishedAt: Date;
  endedByTimeout: boolean;
}): Promise<{ won: boolean; attempt: ExamAttempt }> {
  const questions = await prisma.examQuestion.findMany({
    where: { examId: input.examId },
    select: { id: true, correctIndexSnapshot: true },
  });
  const correctCount = questions.filter(
    (q) => input.answers[q.id] === q.correctIndexSnapshot
  ).length;

  const { count } = await prisma.examAttempt.updateMany({
    where: { id: input.attemptId, finishedAt: null },
    data: {
      answers: input.answers,
      correctCount,
      totalQuestions: questions.length,
      finishedAt: input.finishedAt,
      endedByTimeout: input.endedByTimeout,
    },
  });

  const attempt = await prisma.examAttempt.findUniqueOrThrow({
    where: { id: input.attemptId },
  });
  return { won: count === 1, attempt };
}

export async function notifyInstructorsAboutFinish(attempt: {
  examId: string;
  studentId: string;
  correctCount: number;
  totalQuestions: number;
}): Promise<void> {
  const [student, exam] = await Promise.all([
    prisma.user.findUnique({
      where: { id: attempt.studentId },
      select: { name: true },
    }),
    prisma.exam.findUnique({
      where: { id: attempt.examId },
      select: { title: true, groups: { select: { instructorId: true } } },
    }),
  ]);
  if (!exam) return;

  const instructorIds = [...new Set(exam.groups.map((g) => g.instructorId))];
  const studentName = student?.name ?? 'یه دانشجو';
  await Promise.all(
    instructorIds.map((instructorId) =>
      notifyUser(
        instructorId,
        `${studentName} آزمون «${exam.title}» رو با نمره‌ی ${attempt.correctCount} از ${attempt.totalQuestions} تموم کرد`,
        'award'
      )
    )
  );
}

// attempt‌هایی که وقتشون تموم شده (+ مهلت) ولی هیچ‌وقت finish نشدن (قطعی
// نت/بستن مرورگر) با جواب‌های autosave‌شده بسته می‌شن
export async function finalizeExpiredAttempts(
  opts: { examId?: string; studentId?: string; limit?: number } = {}
): Promise<number> {
  const stale = await prisma.examAttempt.findMany({
    where: {
      finishedAt: null,
      expiresAt: { lt: new Date(Date.now() - FINISH_GRACE_MS) },
      ...(opts.examId ? { examId: opts.examId } : {}),
      ...(opts.studentId ? { studentId: opts.studentId } : {}),
    },
    take: opts.limit ?? 200,
  });

  let finalized = 0;
  for (const a of stale) {
    const { won, attempt } = await finalizeAttempt({
      attemptId: a.id,
      examId: a.examId,
      answers: sanitizeAnswers(a.answers),
      finishedAt: a.expiresAt,
      endedByTimeout: true,
    });
    if (!won) continue;
    finalized++;
    await notifyInstructorsAboutFinish(attempt).catch((err) =>
      console.error('notifyInstructorsAboutFinish failed:', err)
    );
  }
  return finalized;
}

// sweep دوره‌ای برای attempt‌های رهاشده - چند instance هم‌زمان اجرا بشن مشکلی
// نیست چون finalizeAttempt اتمیکه
export function startAttemptSweeper(intervalMs = 60_000) {
  const timer = setInterval(() => {
    finalizeExpiredAttempts().catch((err) =>
      console.error('finalizeExpiredAttempts failed:', err)
    );
  }, intervalMs);
  timer.unref();
  return timer;
}
