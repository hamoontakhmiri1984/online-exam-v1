import PanelBack from '../../../components/PanelBack/PanelBack';
import { useState } from 'react';
import {
  Clock,
  TimerOff,
  Ban,
  ListChecks,
  ShieldAlert,
} from 'lucide-react';
import AppLayout from '../../../components/AppLayout/AppLayout';
import Modal from '../../../components/Modal/Modal';
import type { Exam } from '../../../api/examApi';
import ScheduledExamCountdown, { useScheduledCountdown } from './ScheduledExamCountdown';

interface IntroScreenProps {
  exam: Exam;
  questionCount: number;
  onBack: () => void;
  onStart: () => void;
  isStarting: boolean;
  startError: string | null;
}

function IntroScreen({
  exam,
  questionCount,
  onBack,
  onStart,
  isStarting,
  startError,
}: IntroScreenProps) {
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const remaining = useScheduledCountdown(exam.date);
  const notStarted = remaining > 0;

  function confirmStart() {
    setShowStartConfirm(false);
    if (new Date(exam.date).getTime() > Date.now()) return;

    // Fullscreen must be requested from the user's click; failure must not block the exam.
    const root = document.documentElement;
    if (typeof root.requestFullscreen === 'function') {
      try {
        void root.requestFullscreen().catch(() => undefined);
      } catch {
        // Some browsers reject fullscreen synchronously; starting must still work.
      }
    }

    onStart();
  }

  return (
    <AppLayout title={exam.title}>
      <div className="mx-auto max-w-lg">
        <PanelBack onClick={onBack} label="بازگشت به لیست آزمون‌ها" className="mb-4" />

        <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-ink dark:bg-brand-600/15">
            <ListChecks size={22} />
          </div>

          <h2 className="mb-1.5 text-xl font-bold text-gray-900 dark:text-white">
            {exam.title}
          </h2>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            قبل از شروع، این نکات رو حتماً بخون
          </p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/60">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {questionCount.toLocaleString('fa-IR')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تعداد سوالات
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/60">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {exam.durationMinutes.toLocaleString('fa-IR')} دقیقه
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                مدت زمان آزمون
              </p>
            </div>
          </div>

          {notStarted && <div className="mb-6"><ScheduledExamCountdown scheduledAt={exam.date} /></div>}

          <ul className="mb-8 flex flex-col gap-3">
            <li className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <Clock
                size={16}
                className="mt-0.5 shrink-0 text-brand-ink"
              />
              با شروع آزمون، تایمر فعال می‌شه و دیگه متوقف نمی‌شه.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <TimerOff
                size={16}
                className="mt-0.5 shrink-0 text-danger-500 dark:text-danger-400"
              />
              با اتمام زمان، آزمون به‌صورت خودکار ثبت و بسته می‌شه.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <Ban
                size={16}
                className="mt-0.5 shrink-0 text-accent-500 dark:text-accent-400"
              />
              بهتره تا آخر آزمون از این صفحه خارج نشی.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <Ban
                size={16}
                className="mt-0.5 shrink-0 text-accent-500 dark:text-accent-400"
              />
              کپی، برش و چسباندن در صفحه‌ی آزمون غیرفعال است.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <ShieldAlert
                size={16}
                className="mt-0.5 shrink-0 text-brand-ink"
              />
              آزمون تلاش می‌کند در حالت تمام‌صفحه اجرا شود. می‌توانی خروج از آن را در مرورگر انجام بدهی؛ این رویداد ثبت می‌شود.
            </li>
          </ul>

          {startError && (
            <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:bg-danger-500/10 dark:text-danger-400">
              {startError}
            </p>
          )}

          <button
            onClick={() => setShowStartConfirm(true)}
            disabled={isStarting || notStarted}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {notStarted ? 'تا زمان شروع آزمون منتظر بمانید' : isStarting ? 'در حال شروع...' : 'شروع آزمون'}
          </button>
        </div>
      </div>

      <Modal
        isOpen={showStartConfirm}
        onClose={() => setShowStartConfirm(false)}
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500">
          <ShieldAlert size={20} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
          مطمئنی می‌خوای شروع کنی؟
        </h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          از همین لحظه تایمر {exam.durationMinutes.toLocaleString('fa-IR')}{' '}
          دقیقه‌ای فعال می‌شه و امکان توقف اون وجود نداره.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowStartConfirm(false)}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            انصراف
          </button>
          <button
            onClick={confirmStart}
            disabled={notStarted || isStarting}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            بله، شروع کن
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default IntroScreen;
