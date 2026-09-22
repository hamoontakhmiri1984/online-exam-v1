import { CheckCircle2 } from 'lucide-react';
import AppLayout from '../../../components/AppLayout/AppLayout';
import type { Exam } from '../../../api/examApi';
import type { Question } from '../../../api/questionApi';
import TimerBadge from './TimerBadge';
import ExamWarnings from './ExamWarnings';
import SaveStatusBadge from './SaveStatusBadge';
import type { AutosaveStatus } from '../../../hooks/useExamRunner/useExamAutosave';

interface ReviewScreenProps {
  exam: Exam;
  questions: Question[];
  answers: Record<string, number>;
  timeLeft: number;
  saveStatus: AutosaveStatus;
  onRetrySave: () => void;
  activeWarning: '5min' | '1min' | null;
  onDismissWarning: () => void;
  onGoToQuestion: (index: number) => void;
  onBackToCurrent: () => void;
  onFinish: () => void;
}

function ReviewScreen({
  exam,
  questions,
  answers,
  timeLeft,
  saveStatus,
  onRetrySave,
  activeWarning,
  onDismissWarning,
  onGoToQuestion,
  onBackToCurrent,
  onFinish,
}: ReviewScreenProps) {
  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined
  ).length;

  return (
    <AppLayout title={exam.title}>
      <ExamWarnings
        activeWarning={activeWarning}
        onDismiss={onDismissWarning}
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              مرور پاسخ‌ها
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              قبل از ثبت نهایی، روی هر سوال بزن تا برگردی و جوابش رو چک یا عوض
              کنی
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SaveStatusBadge status={saveStatus} onRetry={onRetrySave} />
            <TimerBadge timeLeft={timeLeft} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-success-500/10 p-3 text-center dark:bg-success-500/15">
            <p className="text-lg font-bold text-success-600 dark:text-success-500">
              {answeredCount.toLocaleString('fa-IR')}
            </p>
            <p className="text-xs text-success-600/70 dark:text-success-500/70">
              پاسخ داده‌شده
            </p>
          </div>
          <div className="rounded-xl bg-accent-500/10 p-3 text-center dark:bg-accent-500/15">
            <p className="text-lg font-bold text-accent-600 dark:text-accent-500">
              {(questions.length - answeredCount).toLocaleString('fa-IR')}
            </p>
            <p className="text-xs text-accent-600/70 dark:text-accent-500/70">
              بدون پاسخ
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-5 gap-2 sm:grid-cols-8">
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            return (
              <button
                key={q.id}
                onClick={() => onGoToQuestion(idx)}
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold transition hover:scale-105 ${
                  isAnswered
                    ? 'bg-success-500/10 text-success-600 hover:bg-success-500/20 dark:bg-success-500/15 dark:text-success-500'
                    : 'bg-accent-500/10 text-accent-600 hover:bg-accent-500/20 dark:bg-accent-500/15 dark:text-accent-500'
                }`}
              >
                {(idx + 1).toLocaleString('fa-IR')}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBackToCurrent}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            بازگشت به آزمون
          </button>
          <button
            onClick={onFinish}
            className="flex items-center gap-2 rounded-xl bg-success-600 px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
          >
            <CheckCircle2 size={16} />
            ثبت نهایی و مشاهده‌ی نمره
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export default ReviewScreen;