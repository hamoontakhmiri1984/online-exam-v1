import { Calendar, Sparkles, type LucideIcon } from 'lucide-react';
import { getTodayJalali } from '../Dashboard.utils';

export function DashboardWelcome({ name, description }: { name: string; description: string }) {
  return (
    <header className="mb-8">
      <div className="mb-4 flex justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm dark:border-gray-700 dark:bg-slate-800/80 dark:text-gray-300">
          <Calendar size={13}/>{getTodayJalali()}
        </span>
      </div>
      <div className="glass-welcome flex min-h-36 flex-wrap items-center justify-between gap-5 rounded-3xl px-8 py-8 text-white">
        <div>
          <p className="flex items-center gap-2 text-sm text-white/85"><Sparkles size={15}/> خوش آمدید</p>
          <h1 className="mt-2 text-2xl font-extrabold">{name}</h1>
        </div>
        <p className="max-w-xs text-sm leading-7 text-white/85">{description}</p>
      </div>
    </header>
  );
}

export type StatTone = 'violet' | 'cyan' | 'green' | 'amber';
export function DashboardStatCard({ icon: Icon, label, value, tone }: {
  icon: LucideIcon; label: string; value: string; tone: StatTone;
}) {
  return (
    <article className={`glass-unified-stat glass-unified-stat--${tone} flex flex-col rounded-3xl border p-5`}>
      <div className="glass-unified-stat-content"><div className="glass-unified-stat-icon" aria-hidden="true"><Icon size={25} strokeWidth={1.8}/></div><div className="glass-unified-stat-copy"><p className="glass-unified-stat-label">{label}</p><p className="glass-unified-stat-value" dir="auto">{value}</p></div></div>
    </article>
  );
}
