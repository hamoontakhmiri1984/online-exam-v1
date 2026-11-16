import { Clock } from 'lucide-react';

const CRITICAL_THRESHOLD_SECONDS = 60;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  const pad = (n: number) =>
    n.toLocaleString('fa-IR', { minimumIntegerDigits: 2 });
  return `${pad(minutes)}:${pad(seconds)}`;
}

interface TimerBadgeProps {
  timeLeft: number;
}

function TimerBadge({ timeLeft }: TimerBadgeProps) {
  const isCritical = timeLeft <= CRITICAL_THRESHOLD_SECONDS;

  return (
    <div
      className={`inline-flex h-11 w-32 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold shadow-sm transition-colors ${
        isCritical
          ? 'border-rose-200/70 bg-rose-50/90 text-rose-600 dark:border-rose-400/25 dark:bg-rose-950/40 dark:text-rose-300'
          : 'border-violet-200/70 bg-white/80 text-brand-ink dark:border-violet-400/25 dark:bg-violet-500/10'
      }`}
    >
      <Clock size={17} className="shrink-0 opacity-75" />
      <span dir="ltr" className="min-w-[5.8ch] whitespace-nowrap text-center text-[15px] font-extrabold tabular-nums tracking-wide">{formatTime(timeLeft)}</span>
    </div>
  );
}

export default TimerBadge;