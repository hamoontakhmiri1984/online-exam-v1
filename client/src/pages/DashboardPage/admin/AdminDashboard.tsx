import ReportOverview from '../../../components/AdminUI/ReportOverview';
import { EventsList } from '../../AdminManagementPage/EventsPage';
import { useCallback, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  RotateCw,
  XCircle,
} from 'lucide-react';
import AppLayout from '../../../components/AppLayout/AppLayout';
import Toast from '../../../components/Toast/Toast';
import useAsyncData from '../../../hooks/useAsyncData';
import { getCurrentUser } from '../../../api/authApi';
import {
  getAdminDashboard,
  type AdminDashboard as AdminDashboardData,
  type AdminExamState,
} from '../../../api/adminDashboardApi';
import { formatDateOnly, formatExamDateTime } from '../../../utils/formatDate';
import { getTodayJalali } from '../Dashboard.utils';

const fa = (n: number) => n.toLocaleString('fa-IR');
const panel =
  'overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900';
const linkBtn =
  'inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:text-gray-200 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-300';

const status: Record<AdminExamState, { label: string; chip: string; dot: string }> = {
  draft: {
    label: 'پیش‌نویس',
    chip: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  upcoming: {
    label: 'پیش‌رو',
    chip: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    dot: 'bg-brand-500',
  },
  completed: {
    label: 'پایان‌یافته',
    chip: 'bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    dot: 'bg-success-500',
  },
};

function StatusChip({ state }: { state: AdminExamState }) {
  const s = status[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function StatCell({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`px-5 py-5 ${
        alert
          ? 'bg-amber-50 dark:bg-amber-500/10'
          : 'bg-white dark:bg-gray-900'
      }`}
    >
      <p
        className={`text-3xl font-bold tabular-nums ${
          alert
            ? 'text-amber-700 dark:text-amber-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {fa(value)}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function QueueRow({
  title,
  sub,
  date,
}: {
  title: string;
  sub: string;
  date: string;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
      >
        {title.trim()[0] ?? '؟'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
      <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
        {date}
      </time>
    </li>
  );
}

function Queue({
  title,
  total,
  to,
  children,
}: {
  title: string;
  total: number;
  to: string;
  children: ReactNode;
}) {
  return (
    <section className={`${panel} flex flex-col`}>
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span
          className={`min-w-7 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
            total > 0
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {fa(total)}
        </span>
      </header>
      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <CheckCircle2 size={28} className="text-success-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            درخواستی در انتظار بررسی نیست
          </p>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-gray-100 dark:divide-gray-800">
            {children}
          </ul>
          <Link
            to={to}
            className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm font-medium text-brand-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-brand-300 dark:hover:bg-gray-800/50"
          >
            بررسی درخواست‌ها
            <ChevronLeft size={16} />
          </Link>
        </>
      )}
    </section>
  );
}

function ExamActions({ instructorId }: { instructorId: string }) {
  const base = `/instructors/${encodeURIComponent(instructorId)}`;
  return (
    <div className="flex gap-2">
      <Link to={`${base}?tab=exams`} className={linkBtn}>
        جزئیات
      </Link>
      <Link to={`${base}?tab=results`} className={linkBtn}>
        نتایج
      </Link>
    </div>
  );
}

function RecentExams({ exams }: { exams: AdminDashboardData['recentExams'] }) {
  return (
    <section className={panel}>
      <header className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          آزمون‌های اخیر
        </h2>
      </header>

      {exams.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">
          هنوز آزمونی ثبت نشده
        </p>
      ) : (
        <>

          <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
            {exams.map((e) => (
              <li key={e.id} className="space-y-3 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {e.title}
                  </p>
                  <StatusChip state={e.status} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {e.instructorName || '—'} — {formatExamDateTime(e.scheduledAt)} —{' '}
                  {fa(e.participants)} شرکت‌کننده
                </p>
                <ExamActions instructorId={e.instructorId} />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 font-medium">عنوان</th>
                  <th className="px-5 py-3 font-medium">مدرس</th>
                  <th className="px-5 py-3 font-medium">زمان</th>
                  <th className="px-5 py-3 font-medium">وضعیت</th>
                  <th className="px-5 py-3 font-medium">شرکت‌کنندگان</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {exams.map((e) => (
                  <tr
                    key={e.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="max-w-64 truncate px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">
                      {e.title}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">
                      {e.instructorName || '—'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {formatExamDateTime(e.scheduledAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusChip state={e.status} />
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-gray-600 dark:text-gray-300">
                      {fa(e.participants)}
                    </td>
                    <td className="px-5 py-3.5">
                      <ExamActions instructorId={e.instructorId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Content({ data }: { data: AdminDashboardData }) {
  const { stats, attention, recentExams } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 lg:grid-cols-4 dark:border-gray-800 dark:bg-gray-800">
        <StatCell label="مدرسان تأییدشده" value={stats.approvedInstructors} />
        <StatCell label="دانشجویان" value={stats.students} />
        <StatCell label="آزمون‌های فعال" value={stats.activeExams} />
        <StatCell
          label="درخواست‌های منتظر بررسی"
          value={stats.pendingRequests}
          alert={stats.pendingRequests > 0}
        />
      </div>

      <section aria-labelledby="attention-title">
        <h2
          id="attention-title"
          className="mb-3 font-semibold text-gray-900 dark:text-white"
        >
          نیازمند رسیدگی
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Queue
            title="تأیید مدرس"
            total={attention.instructors.total}
            to="/instructor-approvals"
          >
            {attention.instructors.items.map((i) => (
              <QueueRow
                key={i.id}
                title={i.name || 'بدون نام'}
                sub={i.email || i.phone || '—'}
                date={formatDateOnly(i.createdAt)}
              />
            ))}
          </Queue>
          <Queue
            title="تأیید گروه"
            total={attention.groups.total}
            to="/group-approvals"
          >
            {attention.groups.items.map((g) => (
              <QueueRow
                key={g.id}
                title={g.name}
                sub={`${g.category} — ${g.instructorName || 'بدون نام'}`}
                date={formatDateOnly(g.createdAt)}
              />
            ))}
          </Queue>
        </div>
      </section>

      <RecentExams exams={recentExams} />
    </div>
  );
}

export default function AdminDashboard() {
  const user = getCurrentUser();
  const reduceMotion = useReducedMotion();
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const fetchDashboard = useCallback(async () => {
    const result = await getAdminDashboard();
    setUpdatedAt(new Date());
    return result;
  }, []);
  const { data, loading, error, clearError, refetch } =
    useAsyncData<AdminDashboardData | null>(
      fetchDashboard,
      null,
      'دریافت اطلاعات داشبورد با خطا مواجه شد'
    );
  const pending = data?.stats.pendingRequests ?? 0;
  const displayName = user?.name || user?.username;

  return (
    <AppLayout title="میزکار">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            میزکار{displayName ? ` · ${displayName}` : ''}
          </h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {pending > 0
                ? `${fa(pending)} درخواست در انتظار بررسی است`
                : 'درخواستی در انتظار بررسی نیست'}
            </p>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <CalendarDays size={14} />
          {getTodayJalali()}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400" role="status">
          {loading ? 'در حال به‌روزرسانی اطلاعات…' : updatedAt ? `آخرین به‌روزرسانی: ${updatedAt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}` : 'نمای کلی سامانه'}
        </p>
        <button type="button" onClick={() => refetch()} disabled={loading} className={`${linkBtn} gap-2 disabled:cursor-wait disabled:opacity-50`}>
          <RotateCw size={14} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />به‌روزرسانی
        </button>
      </div>
      {error && data && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">به‌روزرسانی انجام نشد؛ اطلاعات قبلی نمایش داده می‌شود.</p>}
      {loading && !data ? (
        <div role="status" aria-label="در حال بارگذاری میزکار" className="space-y-5 animate-pulse motion-reduce:animate-none">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800" />)}</div>
          <div className="grid gap-4 lg:grid-cols-2">{[0,1].map(i => <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800" />)}</div>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} aria-busy={loading}>
          <Content data={data} />
          <div className="mt-8"><ReportOverview /><h2 className="mb-4 text-lg font-semibold dark:text-white">رویدادهای مدیریتی</h2><EventsList compact /><Link to="/admin-events" className="mt-3 inline-block text-sm text-brand-600 dark:text-brand-400">مشاهدهٔ سوابق رویدادها</Link></div>
        </motion.div>
      ) : (
        <div className={`${panel} flex flex-col items-center gap-3 px-5 py-12`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            اطلاعات داشبورد بارگذاری نشد.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className={`${linkBtn} gap-1.5`}
          >
            <RotateCw size={14} />
            تلاش دوباره
          </button>
        </div>
      )}
    </AppLayout>
  );
}
