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
    // API contract: answers[qId] is the displayed/shuffled option index submitted by the student,
    // not the canonical optionsSnapshot index. Convert through getOptionOrder(shuffleSeed, qId)
    // before using it for per-option analytics or presenting canonical option labels.
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
