import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type ContentPageHeaderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function ContentPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: ContentPageHeaderProps) {
  return (
    <header
      dir="rtl"
      className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200/50 bg-gradient-to-bl from-violet-50 via-white to-white p-6 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900"
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <Icon size={18} aria-hidden="true" />
          {eyebrow}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
