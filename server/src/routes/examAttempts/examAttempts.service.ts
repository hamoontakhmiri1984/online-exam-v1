export function serializeAttempt(a: {
  id: string;
  examId: string;
  studentId: string;
  answers: unknown;
  correctCount: number;
  totalQuestions: number;
  startedAt: Date;
  finishedAt: Date | null;
  expiresAt: Date;
  endedByTimeout: boolean;
  answersRevision: number;
}) {
  return {
    id: a.id,
    examId: a.examId,
    studentId: a.studentId,
    answers: a.answers,
    // شماره‌ی نسخه‌ی آخرین ذخیره‌ی خودکار؛ کلاینت بعد از رفرش شمارنده‌ش رو از
    // همین‌جا ادامه می‌ده تا ذخیره‌های بعدیش «قدیمی» حساب نشن
    answersRevision: a.answersRevision,
    correctCount: a.correctCount,
    totalQuestions: a.totalQuestions,
    startedAt: a.startedAt.toISOString(),
    // null یعنی attempt هنوز در حال انجامه (finish نشده)
    finishedAt: a.finishedAt ? a.finishedAt.toISOString() : null,
    expiresAt: a.expiresAt.toISOString(),
    endedByTimeout: a.endedByTimeout,
  };
}