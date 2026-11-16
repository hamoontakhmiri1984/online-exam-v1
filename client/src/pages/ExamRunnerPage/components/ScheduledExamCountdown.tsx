import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';

type Props = { scheduledAt: string; compact?: boolean };

function remainingSeconds(scheduledAt: string) {
  const target = new Date(scheduledAt).getTime();
  return Number.isFinite(target) ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0;
}

export function useScheduledCountdown(scheduledAt: string) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(scheduledAt));
  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(scheduledAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [scheduledAt]);
  return seconds;
}

export default function ScheduledExamCountdown({ scheduledAt, compact = false }: Props) {
  const seconds = useScheduledCountdown(scheduledAt);
  if (seconds <= 0) return null;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (value: number) => value.toLocaleString('fa-IR', { minimumIntegerDigits: 2 });
  const countdown = [hours + days * 24, minutes, secs].map(pad).join(':');
  return (
    <div role="timer" aria-label="زمان باقی‌مانده تا شروع آزمون" className={`rounded-2xl border border-violet-200/70 bg-violet-50/70 text-center dark:border-violet-400/25 dark:bg-violet-500/10 ${compact ? 'px-4 py-3' : 'px-5 py-5'}`}>
      <p className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-200">
        <Clock3 size={17} /> زمان باقی‌مانده تا شروع آزمون
      </p>
      <div dir="ltr" className="text-3xl font-extrabold tabular-nums tracking-wider text-violet-800 dark:text-violet-100">{countdown}</div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">ساعت : دقیقه : ثانیه</p>
    </div>
  );
}
