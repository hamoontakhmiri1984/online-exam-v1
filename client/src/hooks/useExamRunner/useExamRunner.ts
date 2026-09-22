import useExamData from './useExamData';
import useExamFlow from './useExamFlow';
import useExamAnswers from './useExamAnswers';
import useExamTimer from './useExamTimer';
import useExamSubmission from './useExamSubmission';
import useExamAutosave from './useExamAutosave';
import { remainingSecondsUntil } from './examClock';

function useExamRunner(examId: string) {
  const flow = useExamFlow(examId);

  const {
    exam,
    questionCount,
    questions,
    loading,
    error: dataError,
    retry: retryLoadData,
  } = useExamData(examId, flow.hasStarted);

  const {
    currentQuestion,
    currentIndex,
    isLastQuestion,
    answers,
    isReviewing,
    selectAnswer,
    goToNext,
    goToPrevious,
    goToQuestion,
    proceedFromLastQuestion,
  } = useExamAnswers(questions, exam, flow.initialAnswers, flow.finishExam);

  const { status: saveStatus, retry: retrySave } = useExamAutosave(
    examId,
    exam,
    flow.hasStarted,
    flow.isFinished,
    answers,
    flow.initialRevision
  );

  // موعدِ پایان هم‌تراز با ساعت سرور (examClock.ts)؛ اگه سرور serverNow
  // نداده بود، همون رفتار قبلی (expiresAt خام روی ساعت دستگاه)
  const deadlineMs =
    flow.deadlineLocalMs ??
    (flow.expiresAt ? new Date(flow.expiresAt).getTime() : null);
  const durationSeconds =
    deadlineMs !== null
      ? remainingSecondsUntil(deadlineMs)
      : exam
    ? exam.durationMinutes * 60
    : 0;
  const isTimerActive = !loading && flow.hasStarted && !flow.isFinished;

  const { timeLeft, activeWarning, dismissWarning } = useExamTimer(
    durationSeconds,
    isTimerActive,
    flow.handleTimeout
  );

  const {
    attempt,
    isSubmitting,
    error: submissionError,
    retry: retrySubmission,
  } = useExamSubmission(exam, flow.isFinished, answers);

  return {
    exam,
    questionCount,
    questions,
    loading,
    dataError,
    retryLoadData,
    currentQuestion,
    currentIndex,
    isLastQuestion,
    answers,
    saveStatus,
    retrySave,
    timeLeft,
    hasStarted: flow.hasStarted,
    isStarting: flow.isStarting,
    startError: flow.startError,
    startExam: flow.startExam,
    isFinished: flow.isFinished,
    endedByTimeout: flow.endedByTimeout,
    activeWarning,
    dismissWarning,
    attempt,
    isSubmitting,
    submissionError,
    retrySubmission,
    selectAnswer,
    goToNext,
    goToPrevious,
    finishExam: flow.finishExam,
    isReviewing,
    goToQuestion,
    proceedFromLastQuestion,
  };
}

export default useExamRunner;
