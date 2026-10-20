import type { ReactNode } from 'react';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const toneClass: Record<StatusTone, { chip: string; dot: string }> = {
  neutral: {
    chip: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  info: {
    chip: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    dot: 'bg-brand-500',
  },
  success: {
    chip: 'bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    dot: 'bg-success-500',
  },
  warning: {
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  danger: {
    chip: 'bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-400',
    dot: 'bg-danger-500',
  },
};

export default function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  const t = toneClass[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${t.chip}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}
