import { Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { controlClass } from '../AdminUI/FilterBar';
type Props = {
  maxSearchLength?: number;
  page: number; pageSize: number; total: number; loading: boolean;
  q: string; setPage: (page: number) => void; setSearch: (q: string) => void;
};
export default function ListPagination({ page, pageSize, total, loading, q, setPage, setSearch, maxSearchLength = 200 }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="ui-list-toolbar mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white/65 p-3 text-sm shadow-sm dark:border-violet-400/10 dark:bg-slate-900/40">
      <div className="relative min-w-52 flex-1 sm:max-w-sm">
        <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="search" aria-label="جستجو" placeholder="جستجو..." maxLength={maxSearchLength}
          value={q} onChange={event => setSearch(event.target.value)}
          className={`${controlClass} w-full pr-10`} />
      </div>
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-violet-50 px-3 py-2 font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-200" aria-live="polite">
            {total.toLocaleString('fa-IR')} مورد
          </span>
          {pages > 1 && (
            <nav aria-label="صفحه‌بندی" className="flex items-center gap-1.5">
              <button type="button" aria-label="صفحه قبلی" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-violet-100 bg-white/80 px-3 text-gray-600 transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"><ChevronRight size={15}/> قبلی</button>
              <span className="min-w-16 text-center text-xs text-gray-500 dark:text-gray-400">{page.toLocaleString('fa-IR')} / {pages.toLocaleString('fa-IR')}</span>
              <button type="button" aria-label="صفحه بعدی" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-violet-100 bg-white/80 px-3 text-gray-600 transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">بعدی <ChevronLeft size={15}/></button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
