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
  // موعدِ پایان روی ساعتِ *محلی* (هم‌تراز‌شده با سرور)؛ null یعنی سرور
  // serverNow نداده/نامعتبر بود و تایمر به expiresAt خام برمی‌گرده
  const [deadlineLocalMs, setDeadlineLocalMs] = useState<number | null>(null);
  // null یعنی هنوز از سرور نیومده. بعد از یه‌بار مقداردهی (حتی {} خالی برای
  // شروع تازه)، useExamAnswers باهاش answers رو seed می‌کنه - لازم برای
  // resume بعد از رفرش وسط آزمون
  const [initialAnswers, setInitialAnswers] = useState<AnswersMap | null>(null);
  // شماره‌ی نسخه‌ی آخرین ذخیره‌ی سرور؛ autosave شمارنده‌ش رو از این ادامه می‌ده
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
      // برای resume (attempt از قبل شروع‌شده) پاسخ‌های ذخیره‌شده‌ی قبلی رو
      // هم می‌گیریم؛ برای شروع تازه همون {} برمی‌گرده
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
