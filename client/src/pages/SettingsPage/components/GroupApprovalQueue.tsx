import { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, RefreshCw, Check, X, UsersRound } from 'lucide-react';
import UiSelect from '../../../components/UiSelect';
import {
  getGroupReviews,
  reviewGroup,
  type GroupReview,
} from '../../../api/approvalPolicyApi';
const labels = {
  Pending: 'منتظر بررسی',
  Approved: 'تأییدشده',
  Rejected: 'ردشده',
};
export default function GroupApprovalQueue({
  onChanged,
}: {
  onChanged: () => void;
}) {
  const [status, setStatus] =
    useState<GroupReview['approvalStatus']>('Pending');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GroupReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getGroupReviews(status, { page, pageSize: 10 })
      .then((data) => {
        if (!active) return;
        if (!data.items.length && page > 1) {
          setPage(page - 1);
          return;
        }
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => {
        if (active) setError(e.message || 'دریافت فهرست ناموفق بود.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, reload]);
  async function decide(group: GroupReview, decision: 'Approved' | 'Rejected') {
    if (pending.current) return;
    pending.current = true;
    setBusy(group.id);
    setError('');
    try {
      await reviewGroup(group, decision);
      onChanged();
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت تصمیم ناموفق بود.');
    } finally {
      pending.current = false;
      setBusy('');
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / 10));
  return (
    <section className="group-approval-panel space-y-5 rounded-3xl border border-violet-200/40 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-violet-400/15 dark:bg-slate-800/55 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-violet-600 dark:text-violet-300"><UsersRound size={19}/><span className="text-xs font-bold">مدیریت درخواست‌ها</span></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">بررسی گروه‌ها</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">درخواست‌های ایجاد گروه را بررسی و مدیریت کنید.</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          وضعیت گروه
          <span className="relative block min-w-44">
            <UiSelect
              disabled={!!busy}
              value={status}
              onChange={(e) => { setStatus(e.target.value as GroupReview['approvalStatus']); setPage(1); }}
              className="w-full"
            >
              {Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </UiSelect>
          </span>
        </label>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700">در حال دریافت گروه‌ها…</p>
      ) : !error && (items.length ? (
        <div className="grid gap-3">
          {items.map((group) => (
            <article key={group.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/75 bg-white/65 p-4 transition-colors hover:border-violet-300/70 dark:border-slate-700/70 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:p-5">
              <div className="min-w-0">
                <h4 className="font-bold text-slate-800 dark:text-white">{group.name}</h4>
                <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">مدرس: {group.instructor.name || group.instructor.username || 'بدون نام'} <span className="mx-2 text-slate-300">•</span>{group.category}</p>
              </div>
              {group.approvalStatus !== 'Approved' && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button type="button" disabled={!!busy} onClick={() => decide(group,'Approved')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300"><Check size={16}/>تأیید گروه</button>
                  {group.approvalStatus === 'Pending' && <button type="button" disabled={!!busy} onClick={() => decide(group,'Rejected')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300"><X size={16}/>رد درخواست</button>}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-violet-200/70 bg-violet-50/30 px-5 py-12 text-center dark:border-violet-400/20 dark:bg-violet-500/5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-500"><UsersRound size={22}/></div><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">گروهی با این وضعیت وجود ندارد.</p></div>)}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-5 text-sm dark:border-slate-700/70">
        <button type="button" disabled={loading || !!busy} onClick={() => setReload((x) => x + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3.5 text-xs font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><RefreshCw size={15}/>بارگذاری مجدد</button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')} · {total.toLocaleString('fa-IR')} گروه</span>
          <nav aria-label="صفحه‌بندی گروه‌ها" className="flex items-center gap-2">
            <button type="button" disabled={loading || !!busy || page === 1} onClick={() => setPage(p => p-1)} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><ChevronRight size={16}/>قبلی</button>
            <button type="button" disabled={loading || !!busy || page >= totalPages} onClick={() => setPage(p => p+1)} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">بعدی<ChevronLeft size={16}/></button>
          </nav>
        </div>
      </footer>
    </section>
  );
}
