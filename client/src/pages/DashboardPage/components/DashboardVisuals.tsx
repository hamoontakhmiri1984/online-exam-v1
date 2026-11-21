import { Calendar, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react';
import { getTodayJalali } from '../Dashboard.utils';

export function DashboardWelcome({ name, description }: { name: string; description: string }) {
  return (
    <header className="glass-welcome relative isolate mb-1 flex min-h-32 flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl px-5 py-5 text-white shadow-lg shadow-violet-900/10 sm:px-7 sm:py-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-8 -top-16 h-56 w-56 rounded-full border border-white/10 bg-white/5" />
      <div className="relative z-10 flex min-w-0 items-center gap-4">
        <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-inner sm:flex">
          <GraduationCap size={34} strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium text-white/80">
            <Sparkles size={14} /> خوش آمدید
          </p>
          <h1 className="mt-1 truncate text-xl font-extrabold sm:text-2xl">{name}</h1>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-white/85 sm:text-sm">{description}</p>
        </div>
      </div>
      <div className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
        <Calendar size={14} />
        {getTodayJalali()}
      </div>
    </header>
  );
}

export type StatTone = 'violet' | 'cyan' | 'green' | 'amber';
export function DashboardStatCard({ icon: Icon, label, value, tone }: {
  icon: LucideIcon; label: string; value: string; tone: StatTone;
}) {
  const toneStyles: Record<StatTone, string> = {
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    cyan: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  };

  return (
    <article className="glass-stat glass-unified-stat flex min-h-24 items-center gap-3 rounded-2xl border border-white/75 bg-white/75 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/75 sm:p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneStyles[tone]}`} aria-hidden="true">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-5 text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-extrabold tabular-nums tracking-tight text-gray-900 dark:text-white" dir="auto">{value}</p>
      </div>
    </article>
  );
}
