import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exam } from '../../api/examApi';
import { autosaveAnswers, recordAttemptEvent } from '../../api/examAttemptApi';
import { ApiError } from '../../lib/apiClient';
import type { AnswersMap } from './useExamAnswers';
import {
  createAutosaveController,
  type AutosaveController,
  type AutosaveStatus,
} from './autosaveController';

export type { AutosaveStatus };

// The controller serializes writes and retries failures; autosave runs only during an active attempt.
function useExamAutosave(
  examId: string,
  exam: Exam | null,
  hasStarted: boolean,
  isFinished: boolean,
  answers: AnswersMap,
  initialRevision: number
) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const examIdRef = useRef(examId);
  const isFirstRunRef = useRef(true);
  const controllerRef = useRef<AutosaveController | null>(null);

  useEffect(() => {
    examIdRef.current = examId;
  }, [examId]);

  if (controllerRef.current === null) {
    controllerRef.current = createAutosaveController({
      initialRevision,
      save: (payload, revision) =>
        autosaveAnswers(examIdRef.current, payload, revision),
      // A 409 stops autosave; final grading belongs to finish.
      isConflict: (err) => err instanceof ApiError && err.status === 409,
      onStatus: setStatus,
    });
  }
  const controller = controllerRef.current;

  // Continue from the server revision after re-entry.
  useEffect(() => {
    controller.raiseRevision(initialRevision);
  }, [controller, initialRevision]);

  useEffect(() => {
    if (hasStarted && !isFinished) controller.start();
    else controller.stop();
    return () => controller.stop();
  }, [controller, hasStarted, isFinished]);

  useEffect(() => {
    controller.setLatest(answers);
    if (!hasStarted || isFinished || !exam) return;

    // Restoring the initial answer set does not require a write.
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    controller.markChanged(answers);
  }, [controller, answers, exam, hasStarted, isFinished]);

  // Flush on page hide or network recovery without waiting for debounce.
  useEffect(() => {
    if (!hasStarted || isFinished) return;

    function flushNow() {
      controller.flushNow();
    }
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        flushNow();
        // Telemetry must never block answer autosave.
        void recordAttemptEvent(examIdRef.current, 'TAB_HIDDEN').catch(
          () => undefined,
        );
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', flushNow);
    };
  }, [controller, hasStarted, isFinished]);

  const retry = useCallback(() => controller.retry(), [controller]);

  return { status, retry };
}

export default useExamAutosave;
