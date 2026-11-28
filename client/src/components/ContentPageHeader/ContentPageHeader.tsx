import type { ReactNode, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';

type ContentPageHeaderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
  headingTabIndex?: number;
  variant?: 'default' | 'welcome';
};

export default function ContentPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  headingRef,
  headingTabIndex,
  variant = 'default',
}: ContentPageHeaderProps) {
  return (
    <header
      dir="rtl"
      className={variant === 'welcome'
        ? 'glass-welcome flex min-h-36 flex-wrap items-center justify-between gap-5 rounded-3xl border border-white/20 px-6 py-6 text-white shadow-sm sm:px-8 sm:py-8'
        : 'flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200/50 bg-gradient-to-bl from-violet-50 via-white to-white p-6 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900'}
    >
      <div className="min-w-0">
        <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${variant === 'welcome' ? 'text-white/85' : 'text-brand-ink'}`}>
          <Icon size={18} aria-hidden="true" />
          {eyebrow}
        </div>
        <h1 ref={headingRef} tabIndex={headingTabIndex} className={`text-2xl font-extrabold ${variant === 'welcome' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {title}
        </h1>
        <p className={`mt-2 max-w-xl text-sm leading-7 ${variant === 'welcome' ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
          {description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
