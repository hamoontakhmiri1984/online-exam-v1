import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import Spinner from '../../components/Spinner/Spinner';
import { getExamById, type Exam } from '../../api/examApi';
import {
  getExamIntegrityEvents,
  type ExamIntegrityEvent,
} from '../../api/examAttemptApi';

const EVENT_LABELS: Record<string, string> = {
  tab_hidden: 'خروج از تب آزمون',
  fullscreen_exit: 'خروج از حالت تمام‌صفحه',
  copy_attempt: 'تلاش برای کپی',
  paste_attempt: 'تلاش برای جای‌گذاری',
};

function studentLabel(student: ExamIntegrityEvent['student']): string {
  return student.name?.trim() || student.username || student.id;
}

function ExamEventsPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | undefined>();
  const [events, setEvents] = useState<ExamIntegrityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!examId) {
      setLoading(false);
      setError('شناسهٔ آزمون معتبر نیست.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getExamById(examId), getExamIntegrityEvents(examId)])
      .then(([examData, eventData]) => {
        if (cancelled) return;
        setExam(examData);
        setEvents(eventData);
      })
      .catch(() => {
        if (!cancelled) setError('دریافت رویدادهای آزمون با خطا مواجه شد.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examId, retryToken]);

  return (
    <AppLayout title="رویدادهای آزمون">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/exams')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          بازگشت به آزمون‌ها
        </button>
      </div>
      <PageHeader
        title={exam?.title ?? 'رویدادهای آزمون'}
        description="گزارش رویدادهای ثبت‌شده هنگام شرکت دانشجویان در آزمون"
      />
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        رویدادها به‌تنهایی اثبات تقلب نیستند؛ تغییر تب یا استفاده از کلیپ‌بورد ممکن است علت عادی هم داشته باشد. حداکثر ۵۰۰ رویداد اخیر نمایش داده می‌شود.
      </p>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-gray-900">
          <p className="mb-4 text-sm text-danger-600 dark:text-danger-400">{error}</p>
          <button
            type="button"
            onClick={() => setRetryToken((token) => token + 1)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            تلاش دوباره
          </button>
        </div>
      ) : !exam ? (
        <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          آزمون پیدا نشد یا اجازهٔ مشاهدهٔ آن را نداری.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          {events.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              هنوز رویدادی برای این آزمون ثبت نشده است.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-3 py-3 font-medium">دانشجو</th>
                  <th className="px-3 py-3 font-medium">رویداد</th>
                  <th className="px-3 py-3 font-medium">زمان ثبت</th>
                  <th className="px-3 py-3 font-medium">شناسهٔ تلاش</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="px-3 py-3">{studentLabel(event.student)}</td>
                    <td className="px-3 py-3">{EVENT_LABELS[event.eventType] ?? event.eventType}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {new Date(event.occurredAt).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs" dir="ltr">
                      {event.attemptId.slice(-10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default ExamEventsPage;
