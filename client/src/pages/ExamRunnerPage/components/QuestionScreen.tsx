import { CheckCircle2, Maximize2, Minimize2 } from 'lucide-react';
import AppLayout from '../../../components/AppLayout/AppLayout';
import type { Exam } from '../../../api/examApi';
import type { Question } from '../../../api/questionApi';
import TimerBadge from './TimerBadge';
import ExamWarnings from './ExamWarnings';
import SaveStatusBadge from './SaveStatusBadge';
import type { AutosaveStatus } from '../../../hooks/useExamRunner/useExamAutosave';

interface QuestionScreenProps {
  exam: Exam;
  questions: Question[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  currentQuestion: Question | null;
  currentIndex: number;
  isLastQuestion: boolean;
  answers: Record<string, number>;
  timeLeft: number;
  saveStatus: AutosaveStatus;
  onRetrySave: () => void;
  activeWarning: '5min' | '1min' | null;
  onDismissWarning: () => void;
  onSelectAnswer: (optionIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onLastQuestionAction: () => void;
}

function QuestionScreen({
  exam,
  questions,
  isFullscreen,
  onToggleFullscreen,
  currentQuestion,
  currentIndex,
  isLastQuestion,
  answers,
  timeLeft,
  saveStatus,
  onRetrySave,
  activeWarning,
  onDismissWarning,
  onSelectAnswer,
  onPrevious,
  onNext,
  onLastQuestionAction,
}: QuestionScreenProps) {
  return (
    <AppLayout title={exam.title}>
      <ExamWarnings activeWarning={activeWarning} onDismiss={onDismissWarning} />

      <div className="mx-auto max-w-2xl">

        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            سوال {(currentIndex + 1).toLocaleString('fa-IR')} از{' '}
            {questions.length.toLocaleString('fa-IR')}
          </span>
          <div className="flex items-center gap-3">
            <SaveStatusBadge status={saveStatus} onRetry={onRetrySave} />
            <TimerBadge timeLeft={timeLeft} />
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'ورود به تمام‌صفحه'}
              title={isFullscreen ? 'خروج از تمام‌صفحه' : 'ورود به تمام‌صفحه'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}</span>
            </button>
          </div>
        </div>

        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <h2 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">
            {currentQuestion?.text}
          </h2>

          <div className="flex flex-col gap-3">
            {currentQuestion?.options.map((option, index) => {
              const isSelected = answers[currentQuestion.id] === index;

              return (
                <button
                  key={index}
                  onClick={() => onSelectAnswer(index)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm transition ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`flex items-center gap-3 ${
            exam.allowReview ? 'justify-between' : 'justify-end'
          }`}
        >
          {exam.allowReview && (
            <button
              onClick={onPrevious}
              disabled={currentIndex === 0}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              سوال قبلی
            </button>
          )}

          {isLastQuestion ? (
            <button
              onClick={onLastQuestionAction}
              className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
            >
              <CheckCircle2 size={16} />
              {exam.allowReview ? 'مرور و پایان آزمون' : 'پایان آزمون'}
            </button>
          ) : (
            <button
              onClick={onNext}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              سوال بعدی
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default QuestionScreen;
