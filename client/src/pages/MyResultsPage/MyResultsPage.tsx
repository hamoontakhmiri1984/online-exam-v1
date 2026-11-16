import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  TrendingUp,
  ListChecks,
  TimerOff,
  Eye,
  Inbox,
  XCircle,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import DataTable from '../../components/AdminUI/DataTable';
import EmptyState from '../../components/EmptyState/EmptyState';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import { getCurrentUser } from '../../api/authApi';
import {
  getMyResultsHistory,
  type FinishedAttemptWithExam,
} from '../../api/examAttemptApi';

function scoreTone(percent: number): {
  text: string;
  bg: string;
} {
  if (percent >= 70) {
    return {
      text: 'text-success-600 dark:text-success-500',
      bg: 'bg-success-500/10 dark:bg-success-500/15',
    };
  }
  if (percent >= 40) {
    return {
      text: 'text-accent-600 dark:text-accent-400',
      bg: 'bg-accent-500/10 dark:bg-accent-500/15',
    };
  }
  return {
    text: 'text-danger-600 dark:text-danger-400',
    bg: 'bg-danger-500/10 dark:bg-danger-500/15',
  };
}

function MyResultsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [records, setRecords] = useState<FinishedAttemptWithExam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const data = await getMyResultsHistory();
        if (cancelled) return;
        setRecords(data);
      } catch {
        if (!cancelled) setError('دریافت نتایج با خطا مواجه شد');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const sortedAttempts = [...records].sort(
    (a, b) =>
      new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );

  const averagePercent =
    records.length > 0
      ? Math.round(
          (records.reduce(
            (sum, a) => sum + a.correctCount / (a.totalQuestions || 1),
            0
          ) /
            records.length) *
            100
        )
      : 0;

  const bestPercent =
    records.length > 0
      ? Math.round(
          Math.max(
            ...records.map(
              (a) => (a.correctCount / (a.totalQuestions || 1)) * 100
            )
          )
        )
      : 0;

  const stats = [
    {
      label: 'آزمون‌های داده‌شده',
      value: records.length.toLocaleString('fa-IR'),
      icon: ListChecks,
      bg: 'bg-violet-500/12 text-brand-ink',
    },
    {
      label: 'میانگین نمره',
      value:
        records.length > 0 ? `${averagePercent.toLocaleString('fa-IR')}٪` : '—',
      icon: TrendingUp,
      bg: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-300',
    },
    {
      label: 'بهترین نمره',
      value:
        records.length > 0 ? `${bestPercent.toLocaleString('fa-IR')}٪` : '—',
      icon: Award,
      bg: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
    },
  ];

  return (
    <AppLayout title="نتایج من">
      {error && (
        <Toast message={error} tone="danger" icon={XCircle} onDismiss={() => setError(null)} />
      )}
      {loading ? (
        <Spinner />
      ) : (
        <div className="results-dashboard space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">نتایج من</h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                آمار عملکرد و تاریخچه آزمون‌های شما
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, bg }) => (
              <div key={label} className="results-kpi flex min-h-36 flex-col justify-between rounded-2xl border border-violet-200/40 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-violet-400/20 dark:bg-slate-900/75">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
                  <Icon size={21} />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="results-kpi-number mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <section aria-label="تاریخچه آزمون‌ها" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">تاریخچه آزمون‌ها</h2>
              <span className="rounded-lg bg-violet-100/80 px-3 py-1.5 text-xs font-semibold text-brand-ink dark:bg-violet-500/15">
                {sortedAttempts.length.toLocaleString('fa-IR')} نتیجه
              </span>
            </div>
            {sortedAttempts.length === 0 ? (
              <div className="ui-admin-table flex min-h-80 items-center justify-center rounded-2xl border border-violet-200/50 bg-white/85 px-5 py-8 shadow-sm dark:border-violet-400/15 dark:bg-gray-900/85">
                <EmptyState
                  icon={Inbox}
                  title="هنوز آزمونی نداده‌ای"
                  description="بعد از شرکت در اولین آزمون، نتیجه و روند پیشرفتت اینجا نمایش داده می‌شود."
                  action={{label:'مشاهده آزمون‌ها',onClick:()=>navigate('/exams')}}
                />
              </div>
            ) : (
              <DataTable
                items={sortedAttempts}
                selectedId={selectedAttemptId}
                onSelect={(attempt) => setSelectedAttemptId(attempt.id)}
                columns={[
                  {
                    key: 'exam',
                    label: 'آزمون',
                    render: (attempt) => <span className="font-semibold text-slate-800 dark:text-slate-100">{attempt.exam.title}</span>,
                  },
                  {
                    key: 'date',
                    label: 'تاریخ پایان',
                    render: (attempt) => <time className="whitespace-nowrap text-slate-500 dark:text-slate-400" dateTime={attempt.finishedAt}>{new Date(attempt.finishedAt).toLocaleString('fa-IR')}</time>,
                  },
                  {
                    key: 'correct',
                    label: 'پاسخ‌های صحیح',
                    render: (attempt) => <span className="whitespace-nowrap tabular-nums">{attempt.correctCount.toLocaleString('fa-IR')} از {attempt.totalQuestions.toLocaleString('fa-IR')}</span>,
                  },
                  {
                    key: 'score',
                    label: 'نمره',
                    render: (attempt) => {
                      const percent = Math.round((attempt.correctCount / (attempt.totalQuestions || 1)) * 100);
                      const tone = scoreTone(percent);
                      return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tabular-nums ${tone.bg} ${tone.text}`}>{percent.toLocaleString('fa-IR')}٪</span>;
                    },
                  },
                  {
                    key: 'status',
                    label: 'وضعیت',
                    render: (attempt) => attempt.endedByTimeout ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-rose-600 dark:text-rose-300"><TimerOff size={14}/> اتمام وقت</span>
                    ) : <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">تکمیل‌شده</span>,
                  },
                  {
                    key: 'actions',
                    label: 'عملیات',
                    render: (attempt) => attempt.exam.allowReview ? (
                      <button type="button" onClick={() => navigate(`/exams/${attempt.exam.id}/review`)} className="ui-action-edit inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-violet-200 px-3 py-2 text-xs font-semibold text-brand-ink transition hover:bg-violet-50 dark:border-violet-400/25 dark:hover:bg-violet-500/10">
                        <Eye size={15}/> مرور پاسخ‌ها
                      </button>
                    ) : <span className="text-xs text-slate-400">—</span>,
                  },
                ]}
              />
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
}

export default MyResultsPage;
