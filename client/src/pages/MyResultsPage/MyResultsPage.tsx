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

  // قبلاً: exams (از GET /exams، یعنی فقط آزمون‌های قابل‌دسترسِ *فعلی*) +
  // attempts جدا از هم، و findExam(examId) واسطشون بود. مشکل: با حذف
  // عضویتِ دانشجو از گروهِ صاحبِ یه آزمون، اون examId دیگه تو exams نمی‌اومد
  // و attempt تمام‌شده‌ش (که تو دیتابیس دست‌نخورده مونده بود) هرگز فچ
  // نمی‌شد. حالا همه‌چی از یه endpoint مستقل (GET /attempts/me) میاد که
  // مستقیم رو studentId فیلتر می‌کنه و عنوان/allowReview آزمون رو هم
  // خودش همراه می‌آره.
  const [records, setRecords] = useState<FinishedAttemptWithExam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // سرور همین الان فقط تمام‌شده‌ها رو برمی‌گردونه، پس فیلترِ جداگونه لازم
  // نیست؛ فقط بر اساس تاریخِ اتمام مرتب می‌کنیم (جدیدترین اول)
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
      bg: 'bg-brand-600',
    },
    {
      label: 'میانگین نمره',
      value:
        records.length > 0 ? `${averagePercent.toLocaleString('fa-IR')}٪` : '—',
      icon: TrendingUp,
      bg: 'bg-accent-500',
    },
    {
      label: 'بهترین نمره',
      value:
        records.length > 0 ? `${bestPercent.toLocaleString('fa-IR')}٪` : '—',
      icon: Award,
      bg: 'bg-success-600',
    },
  ];

  return (
    <AppLayout title="نتایج من">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={() => setError(null)}
        />
      )}
      {loading ? (
        <Spinner />
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-6 dark:text-white">نتایج من</h1>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, bg }) => (
              <div
                key={label}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white ${bg}`}
                >
                  <Icon size={20} />
                </div>
                <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              تاریخچه‌ی آزمون‌ها
            </h2>

            {sortedAttempts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
                  <Inbox size={22} />
                </div>
                <p className="text-sm text-gray-400">
                  هنوز هیچ آزمونی نداده‌ای.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/exams')}
                  className="mt-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition"
                >
                  رفتن به لیست آزمون‌ها
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedAttempts.map((attempt) => {
                  const percent = Math.round(
                    (attempt.correctCount / (attempt.totalQuestions || 1)) * 100
                  );
                  const tone = scoreTone(percent);

                  return (
                    <div
                      key={attempt.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {attempt.exam.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                          <span>
                            {new Date(attempt.finishedAt).toLocaleDateString(
                              'fa-IR'
                            )}
                          </span>
                          <span>
                            {attempt.correctCount.toLocaleString('fa-IR')} از{' '}
                            {attempt.totalQuestions.toLocaleString('fa-IR')}{' '}
                            پاسخ درست
                          </span>
                          {attempt.endedByTimeout && (
                            <span
                              title="با اتمام وقت به پایان رسید"
                              className="flex items-center gap-1 text-danger-500"
                            >
                              <TimerOff size={12} />
                              اتمام وقت
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${tone.bg} ${tone.text}`}
                        >
                          {percent.toLocaleString('fa-IR')}٪
                        </span>
                        {/* سرور retake رو با ۴۰۹ رد می‌کنه (یه دانشجو فقط
                        یه‌بار می‌تونه تو هر آزمون شرکت کنه)، پس این دکمه
                        به‌جای «شروع دوباره» به مرورِ پاسخ‌های همون تلاش
                        می‌بره - اونم فقط وقتی exam.allowReview فعال باشه،
                        چون سرور بدون اون جواب صحیح رو برنمی‌گردونه
                        (ExamReviewPage خودش این حالت رو مدیریت می‌کنه).
                        دسترسیِ خودِ GET /exams/:examId/attempts/me هم
                        مستقل از عضویتِ فعلیِ گروهه (examAccess.ts: کافیه
                        قبلاً attempt داشته باشه) پس این دکمه حتی بعد از
                        حذف عضویت هم کار می‌کنه */}
                        {attempt.exam.allowReview && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/exams/${attempt.exam.id}/review`)
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                          >
                            <Eye size={13} />
                            مرور پاسخ‌ها
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}

export default MyResultsPage;
