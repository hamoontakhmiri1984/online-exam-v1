import { Clock } from 'lucide-react';

const CRITICAL_THRESHOLD_SECONDS = 60;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
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
      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
        isCritical
          ? 'bg-danger-50 text-danger-600 dark:bg-danger-950/40 dark:text-danger-400'
          : 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
      }`}
    >
      <Clock size={16} />
      {formatTime(timeLeft)}
    </div>
  );
}

export default TimerBadge;