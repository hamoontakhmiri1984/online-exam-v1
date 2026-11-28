import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type LearningPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
};

export default function LearningPageLayout({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  children,
}: LearningPageLayoutProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
      <header className="learning-page-header flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200/40 bg-gradient-to-bl from-violet-50 via-white to-white p-6 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-ink">
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
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </header>
      <section className="app-panel-card learning-page-panel bg-white p-4 dark:bg-slate-900 sm:p-6">
        {children}
      </section>
    </div>
  );
}
