import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import useExamRunner from '../../hooks/useExamRunner';
import { useExamGuard } from '../../context/ExamGuardContext';
import {
  logExamIntegrityEvent,
  type ExamIntegrityEventType,
} from '../../api/examAttemptApi';
import { formatExamDateTime } from '../../utils/formatDate';
import IntroScreen from './components/IntroScreen';
import QuestionScreen from './components/QuestionScreen';
import ReviewScreen from './components/ReviewScreen';
import ResultScreen from './components/ResultScreen';

function ExamRunnerPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const {
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
    hasStarted,
    isStarting,
    startError,
    startExam,
    isFinished,
    endedByTimeout,
    activeWarning,
    dismissWarning,
    attempt,
    isSubmitting,
    submissionError,
    retrySubmission,
    selectAnswer,
    goToNext,
    goToPrevious,
    finishExam,
    isReviewing,
    goToQuestion,
    proceedFromLastQuestion,
  } = useExamRunner(examId ?? '');

  const { setExamActive } = useExamGuard();

  useEffect(() => {
    setExamActive(hasStarted && !isFinished);
    return () => setExamActive(false);
  }, [hasStarted, isFinished, setExamActive]);

  // These signals help instructors review suspicious patterns; they are not
  // treated as definitive proof of cheating and do not block clipboard actions.
  useEffect(() => {
    if (!examId || !hasStarted || isFinished) return;

    const record = (type: ExamIntegrityEventType) => {
      void logExamIntegrityEvent(examId, type).catch(() => {
        // Logging must never interrupt answering or autosaving.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') record('tab_hidden');
    };

    let wasFullscreen = Boolean(document.fullscreenElement);
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        wasFullscreen = true;
      } else if (wasFullscreen) {
        wasFullscreen = false;
        record('fullscreen_exit');
      }
    };

    const handleCopy = () => record('copy_attempt');
    const handlePaste = () => record('paste_attempt');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [examId, hasStarted, isFinished]);

  useEffect(() => {
    if (!hasStarted || isFinished) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, isFinished]);

  if (dataError) {
    return (
      <AppLayout title="آزمون">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {dataError}
          </p>
          <button
            onClick={retryLoadData}
            className="rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700"
          >
            تلاش دوباره
          </button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="در حال بارگذاری آزمون...">
        <Spinner />
      </AppLayout>
    );
  }

  // Before scheduledAt, a zero count can mean questions have not been released yet.
  if (!exam || questionCount === 0) {
    const notStartedYet = exam && new Date(exam.date).getTime() > Date.now();
    return (
      <AppLayout title="آزمون">
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          {notStartedYet
            ? `این آزمون هنوز شروع نشده. زمان شروع: ${formatExamDateTime(
                exam!.date
              )}`
            : 'این آزمون یافت نشد یا هنوز سوالی برایش ثبت نشده.'}
        </div>
      </AppLayout>
    );
  }

  if (!hasStarted) {
    return (
      <IntroScreen
        exam={exam}
        questionCount={questionCount}
        onBack={() => navigate('/exams')}
        onStart={startExam}
        isStarting={isStarting}
        startError={startError}
      />
    );
  }

  if (isFinished) {
    return (
      <ResultScreen
        exam={exam}
        attempt={attempt}
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        endedByTimeout={endedByTimeout}
        onRetry={retrySubmission}
        onBackToList={() => navigate('/exams')}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <AppLayout title="در حال بارگذاری آزمون...">
        <Spinner />
      </AppLayout>
    );
  }

  if (isReviewing) {
    return (
      <ReviewScreen
        exam={exam}
        questions={questions}
        answers={answers}
        timeLeft={timeLeft}
        saveStatus={saveStatus}
        onRetrySave={retrySave}
        activeWarning={activeWarning}
        onDismissWarning={dismissWarning}
        onGoToQuestion={goToQuestion}
        onBackToCurrent={() => goToQuestion(currentIndex)}
        onFinish={finishExam}
      />
    );
  }

  return (
    <QuestionScreen
      exam={exam}
      questions={questions}
      currentQuestion={currentQuestion}
      currentIndex={currentIndex}
      isLastQuestion={isLastQuestion}
      answers={answers}
      timeLeft={timeLeft}
      saveStatus={saveStatus}
      onRetrySave={retrySave}
      activeWarning={activeWarning}
      onDismissWarning={dismissWarning}
      onSelectAnswer={selectAnswer}
      onPrevious={goToPrevious}
      onNext={goToNext}
      onLastQuestionAction={proceedFromLastQuestion}
    />
  );
}

export default ExamRunnerPage;
