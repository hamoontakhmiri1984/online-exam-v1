import { useCallback, useEffect, useState } from 'react';
import {
  getExamAttemptAudit,
  type ExamAttemptAudit,
} from '../../../api/examAttemptApi';

const PAGE_SIZE = 25;

function formatDate(value: string) {
  return new Date(value).toLocaleString('fa-IR');
}

export default function ExamAttemptAuditPanel({ examId }: { examId: string }) {
  const [attempts, setAttempts] = useState<ExamAttemptAudit[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true);
    setError('');
    try {
      const result = await getExamAttemptAudit(examId, requestedPage, PAGE_SIZE);
      setAttempts(result.items);
      setPage(result.page);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('دریافت گزارش تلاش‌های آزمون ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [examId, page]);

  useEffect(() => {
    void load(1);
  }, [examId]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">گزارش تلاش‌های آزمون</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            این رویدادها از سمت مرورگر گزارش می‌شوند و ممکن است ناقص یا قابل دور زدن باشند؛ به‌تنهایی مدرک تقلب نیستند.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <p role="status" className="py-4 text-sm text-gray-500">در حال دریافت گزارش…</p>
      ) : error ? (
        <div role="alert" className="py-3 text-sm text-danger-600">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 font-medium text-brand-600">
            تلاش دوباره
          </button>
        </div>
      ) : attempts.length === 0 ? (
        <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
          هنوز تلاشی برای این آزمون ثبت نشده است.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-3 py-3 font-medium">دانشجو</th>
                  <th className="px-3 py-3 font-medium">وضعیت</th>
                  <th className="px-3 py-3 font-medium">نمره</th>
                  <th className="px-3 py-3 font-medium">تب پنهان‌شده</th>
                  <th className="px-3 py-3 font-medium">خروج از تمام‌صفحه</th>
                  <th className="px-3 py-3 font-medium">از دست رفتن فوکوس پنجره</th>
                  <th className="px-3 py-3 font-medium">شروع</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">
                      {attempt.student.name?.trim() || attempt.student.username || 'دانشجوی بدون نام'}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                      {attempt.finishedAt ? 'پایان‌یافته' : 'در حال آزمون'}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">
                      {attempt.finishedAt
                        ? `${attempt.correctCount.toLocaleString('fa-IR')} از ${attempt.totalQuestions.toLocaleString('fa-IR')}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={attempt.tabSwitchCount > 0
                        ? 'font-semibold text-amber-700 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'}>
                        {attempt.tabSwitchCount.toLocaleString('fa-IR')} بار
                      </span>
                      {attempt.tabSwitchCount > 0 && attempt.tabSwitches.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          آخرین مورد: {formatDate(attempt.tabSwitches[attempt.tabSwitches.length - 1])}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={attempt.fullscreenExitCount > 0
                        ? 'font-semibold text-amber-700 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'}>
                        {attempt.fullscreenExitCount.toLocaleString('fa-IR')} بار
                      </span>
                      {attempt.fullscreenExitCount > 0 && attempt.fullscreenExits.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          آخرین مورد: {formatDate(attempt.fullscreenExits[attempt.fullscreenExits.length - 1])}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={attempt.windowBlurCount > 0
                        ? 'font-semibold text-amber-700 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'}>
                        {attempt.windowBlurCount.toLocaleString('fa-IR')} بار
                      </span>
                      {attempt.windowBlurCount > 0 && attempt.windowBlurs.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          آخرین مورد: {formatDate(attempt.windowBlurs[attempt.windowBlurs.length - 1])}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(attempt.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>
              {total.toLocaleString('fa-IR')} تلاش · صفحه {page.toLocaleString('fa-IR')} از {Math.max(totalPages, 1).toLocaleString('fa-IR')}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load(page - 1)}
                disabled={loading || page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-700"
              >
                قبلی
              </button>
              <button
                type="button"
                onClick={() => void load(page + 1)}
                disabled={loading || page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-700"
              >
                بعدی
              </button>
            </div>
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-gray-400">
        از دست رفتن فوکوس پنجره نیز ممکن است به اعلان‌ها یا تعامل عادی کاربر مربوط باشد. تمام‌صفحه فقط درخواست می‌شود و مرورگر تضمین نمی‌کند کاربر در آن بماند.
      </p>
    </section>
  );
}
