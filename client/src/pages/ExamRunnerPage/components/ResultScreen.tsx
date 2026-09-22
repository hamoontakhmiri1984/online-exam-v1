import { TimerOff, XCircle } from 'lucide-react';
import AppLayout from '../../../components/AppLayout/AppLayout';
import Spinner from '../../../components/Spinner/Spinner';
import type { Exam } from '../../../api/examApi';
import type { ExamAttempt } from '../../../api/examAttemptApi';

interface ResultScreenProps {
  exam: Exam;
  attempt: ExamAttempt | null;
  isSubmitting: boolean;
  submissionError: string | null;
  endedByTimeout: boolean;
  onRetry: () => void;
  onBackToList: () => void;
}

function ResultScreen({
  exam,
  attempt,
  isSubmitting,
  submissionError,
  endedByTimeout,
  onRetry,
  onBackToList,
}: ResultScreenProps) {
  return (
    <AppLayout title={exam.title}>
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
        {endedByTimeout && (
          <div className="mb-5 flex items-center justify-center gap-1.5 rounded-xl bg-danger-50 py-2 text-xs font-bold text-danger-600 dark:bg-danger-950/40 dark:text-danger-400">
            <TimerOff size={14} />
            زمان آزمون به پایان رسید و به‌صورت خودکار ثبت شد
          </div>
        )}
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          آزمون به پایان رسید
        </h2>
        <p className="mb-6 text-sm text-gray-400">{exam.title}</p>

        {isSubmitting ? (
          <Spinner />
        ) : submissionError ? (
          <div className="mb-8 flex flex-col items-center gap-3 py-4 text-danger-600 dark:text-danger-400">
            <XCircle size={28} />
            <p className="text-sm">{submissionError}</p>
            <button
              onClick={onRetry}
              className="rounded-lg border border-danger-300 px-4 py-1.5 text-xs font-medium text-danger-600 transition hover:bg-danger-50 dark:border-danger-800 dark:text-danger-400 dark:hover:bg-danger-950/40"
            >
              تلاش دوباره
            </button>
          </div>
        ) : attempt ? (
          <>
            <div className="mb-6 text-5xl font-extrabold text-brand-600">
              {Math.round(
                (attempt.correctCount / (attempt.totalQuestions || 1)) * 100
              ).toLocaleString('fa-IR')}
              ٪
            </div>

            <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
              {attempt.correctCount.toLocaleString('fa-IR')} پاسخ درست از{' '}
              {attempt.totalQuestions.toLocaleString('fa-IR')} سوال
            </p>
          </>
        ) : null}

        <button
          onClick={onBackToList}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          بازگشت به لیست آزمون‌ها
        </button>
      </div>
    </AppLayout>
  );
}

export default ResultScreen;
