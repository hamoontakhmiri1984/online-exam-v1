import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import useExamRunner from '../../hooks/useExamRunner';
import { useExamGuard } from '../../context/ExamGuardContext';
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

  // exam پیدا شده ولی تعداد سوال‌ها صفره: یا واقعاً هنوز سوالی ثبت نشده، یا
  // (سمت سرور، questions.ts) هنوز به scheduledAt نرسیدیم و سرور عمداً
  // چیزی برنگردونده - این دومی رو از رو تاریخ خود exam تشخیص می‌دیم تا
  // پیام درست‌تری نشون بدیم، نه یه «یافت نشد» گمراه‌کننده. useExamData
  // خودش تا رسیدن این لحظه poll می‌کنه، پس این صفحه خودکار عوض می‌شه
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

  // start شده ولی سوال‌ها هنوز از سرور نرسیدن (سوال‌ها فقط بعد از start
  // گرفته می‌شن)
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
