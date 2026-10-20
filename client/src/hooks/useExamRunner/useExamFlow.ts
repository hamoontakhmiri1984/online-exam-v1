import { useCallback, useState } from 'react';
import { startAttempt, getMyAttempt } from '../../api/examAttemptApi';
import { ApiError } from '../../lib/apiClient';
import type { AnswersMap } from './useExamAnswers';
import { computeDeadlineLocalMs } from './examClock';

function useExamFlow(examId: string) {
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [endedByTimeout, setEndedByTimeout] = useState<boolean>(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  // Use the server-aligned local deadline; fall back to expiresAt if unavailable.
  const [deadlineLocalMs, setDeadlineLocalMs] = useState<number | null>(null);
  // Null means not loaded; an empty map is a valid initial answer set.
  const [initialAnswers, setInitialAnswers] = useState<AnswersMap | null>(null);
  // Continue from the server revision after re-entry.
  const [initialRevision, setInitialRevision] = useState<number>(0);

  const startExam = useCallback(async () => {
    if (isStarting || hasStarted) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const requestStartedAtMs = Date.now();
      const started = await startAttempt(examId);
      const responseReceivedAtMs = Date.now();
      setExpiresAt(started.expiresAt);
      setDeadlineLocalMs(
        computeDeadlineLocalMs({
          expiresAt: started.expiresAt,
          serverNow: started.serverNow,
          requestStartedAtMs,
          responseReceivedAtMs,
        })
      );
      // Restore saved answers before enabling the resumed attempt.
      const myAttempt = await getMyAttempt(examId);
      setInitialAnswers(myAttempt?.answers ?? {});
      setInitialRevision(myAttempt?.answersRevision ?? 0);
      setHasStarted(true);
    } catch (err) {
      setStartError(
        err instanceof ApiError
          ? err.message
          : 'شروع آزمون با خطا مواجه شد. دوباره تلاش کن.'
      );
    } finally {
      setIsStarting(false);
    }
  }, [examId, isStarting, hasStarted]);

  const finishExam = useCallback(() => {
    setIsFinished(true);
  }, []);

  const handleTimeout = useCallback(() => {
    setEndedByTimeout(true);
    setIsFinished(true);
  }, []);

  return {
    hasStarted,
    isStarting,
    startError,
    isFinished,
    endedByTimeout,
    expiresAt,
    deadlineLocalMs,
    initialAnswers,
    initialRevision,
    startExam,
    finishExam,
    handleTimeout,
  };
}

export default useExamFlow;
