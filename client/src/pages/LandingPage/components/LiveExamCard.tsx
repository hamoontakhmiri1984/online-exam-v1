import { useEffect, useState } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

type Phase = 'question' | 'timer' | 'result';

const PHASE_ORDER: Phase[] = ['question', 'timer', 'result'];
const PHASE_DURATION_MS = 3400;

const DEMO_QUESTION = {
  meta: 'سوال ۳ از ۱۰',
  text: 'کدام هوک برای مدیریت state محلی در React استفاده می‌شود؟',
  options: ['useEffect', 'useState', 'useRef', 'useMemo'],
  correctIndex: 1,
};

function LiveExamCard() {
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(12);

  const phase = PHASE_ORDER[phaseIndex];

  useEffect(() => {
    const cycle = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % PHASE_ORDER.length);
    }, PHASE_DURATION_MS);
    return () => clearInterval(cycle);
  }, []);

  useEffect(() => {
    if (phase === 'question') {
      setSelectedOption(null);
      const pick = setTimeout(
        () => setSelectedOption(DEMO_QUESTION.correctIndex),
        1300
      );
      return () => clearTimeout(pick);
    }

    if (phase === 'timer') {
      setCountdown(12);
      const tick = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 240);
      return () => clearInterval(tick);
    }
  }, [phase]);

  const resultPercent = 92;
  const RING_RADIUS = 42;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringOffset =
    RING_CIRCUMFERENCE - (resultPercent / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative w-full max-w-sm rounded-3xl border border-gray-100 bg-white shadow-2xl shadow-brand-600/10 dark:border-gray-800 dark:bg-gray-900">
      {/* نوار بالای کارت به سبک پنجره‌ی مرورگر - کارت رو از یه div ساده به
          یه «اسکرین‌شات زنده‌ی محصول» تبدیل می‌کنه */}
      <div className="flex items-center justify-between rounded-t-3xl border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-600/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success-600" />
          </span>
         آزمون آنلاین
        </span>
      </div>

      <div key={phase} className="animate-fade-slide min-h-55 p-6">
        {phase === 'question' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">
                {DEMO_QUESTION.meta}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-brand-600/10 px-3 py-1 text-xs font-bold text-brand-600 dark:text-brand-500">
                <Clock size={13} />
                ۰۰:۴۸
              </span>
            </div>

            <p className="mb-4 text-sm font-bold leading-relaxed text-gray-900 dark:text-white">
              {DEMO_QUESTION.text}
            </p>

            <div className="flex flex-col gap-2">
              {DEMO_QUESTION.options.map((option, index) => {
                const isSelected = selectedOption === index;
                return (
                  <div
                    key={option}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs transition-all duration-300 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-600/5 text-brand-700 dark:text-brand-500'
                        : 'border-gray-100 text-gray-600 dark:border-gray-800 dark:text-gray-300'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    {option}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'timer' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="mb-4 text-xs font-medium text-gray-400">
              زمان باقی‌مانده
            </span>
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-gray-100 text-3xl font-extrabold text-brand-600 dark:border-gray-800 dark:text-brand-500">
              {countdown}
            </div>
            <p className="mt-5 text-xs text-gray-400">
              آزمون به‌صورت خودکار ادامه پیدا می‌کند
            </p>
          </div>
        )}

        {phase === 'result' && (
          <div className="flex flex-col items-center py-3 text-center">
            <div className="relative mb-3 flex h-28 w-28 items-center justify-center">
              <svg
                className="absolute inset-0 -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="7"
                  className="stroke-gray-100 dark:stroke-gray-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  className="stroke-success-600 transition-[stroke-dashoffset] duration-1000 ease-out"
                />
              </svg>
              <CheckCircle2
                size={26}
                className="text-success-600 dark:text-success-500"
              />
            </div>
            <div className="mb-1 text-4xl font-extrabold text-gray-900 dark:text-white">
              ۹۲٪
            </div>
            <p className="text-xs text-gray-400">۹ پاسخ درست از ۱۰ سوال</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveExamCard;