import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exam } from '../../api/examApi';
import { finishAttempt, type ExamAttempt } from '../../api/examAttemptApi';
import type { AnswersMap } from './useExamAnswers';

type SubmissionState = {
  attempt: ExamAttempt | null;
  isSubmitting: boolean;
  error: string | null;
};

// Submit once automatically; retries are explicit and server-side finish is idempotent.
function useExamSubmission(
  exam: Exam | null,
  isFinished: boolean,
  answers: AnswersMap
): SubmissionState & { retry: () => void } {
  const hasStartedRef = useRef(false);
  const [state, setState] = useState<SubmissionState>({
    attempt: null,
    isSubmitting: false,
    error: null,
  });

  const submit = useCallback(() => {
    if (!exam) return;
    setState({ attempt: null, isSubmitting: true, error: null });

    finishAttempt(exam.id, answers)
      .then((attempt) => {
        setState({ attempt, isSubmitting: false, error: null });
      })
      .catch(() => {
        setState({
          attempt: null,
          isSubmitting: false,
          error:
            'ثبت نتیجه‌ی آزمون با خطا مواجه شد. اتصال اینترنت را بررسی و دوباره تلاش کن.',
        });
      });
  }, [exam, answers]);

  useEffect(() => {
    if (!isFinished || hasStartedRef.current || !exam) return;
    hasStartedRef.current = true;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, exam]);

  return { ...state, retry: submit };
}

export default useExamSubmission;
