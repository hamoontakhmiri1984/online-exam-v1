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
    answersRevision: a.answersRevision,
    correctCount: a.correctCount,
    totalQuestions: a.totalQuestions,
    startedAt: a.startedAt.toISOString(),
    finishedAt: a.finishedAt ? a.finishedAt.toISOString() : null,
    expiresAt: a.expiresAt.toISOString(),
    endedByTimeout: a.endedByTimeout,
  };
}
