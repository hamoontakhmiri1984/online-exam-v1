// After the submission grace period, grade only previously saved answers.
export const FINISH_GRACE_MS = 30_000;

type ExamWindow = {
  scheduledAt: Date;
  durationMinutes: number;
};

export const toMinute = (d: Date): number => Math.floor(d.getTime() / 60_000);

// Preserve exact timestamps when the minute-precision form has not changed the schedule.
export function resolveScheduledAt(current: Date, requested: Date): Date {
  return toMinute(requested) === toMinute(current) ? current : requested;
}

// Every attempt deadline is capped by the shared exam window end.
export function getExamWindowEndMs(exam: ExamWindow): number {
  return exam.scheduledAt.getTime() + exam.durationMinutes * 60_000;
}

// Release answers only after the shared exam window and grace period, with review enabled.
export function isAnswerKeyReleased(
  exam: ExamWindow & { allowReview: boolean },
  nowMs: number = Date.now()
): boolean {
  if (!exam.allowReview) return false;
  return nowMs >= getExamWindowEndMs(exam) + FINISH_GRACE_MS;
}
