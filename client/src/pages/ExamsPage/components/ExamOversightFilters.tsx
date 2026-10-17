import type { Exam } from '../../../api/examApi';
export function filterOversightExams(exams: Exam[], query: string, status: string) {
  const term = query.trim().toLocaleLowerCase('fa-IR');
  return exams.filter(exam => (!status || exam.status === status) &&
    [exam.title, exam.instructor?.name, exam.instructor?.username].some(value => value?.toLocaleLowerCase('fa-IR').includes(term)));
}
export default function ExamOversightFilters({ query, status, count, onQuery, onStatus }: {
  query: string; status: string; count: number; onQuery: (value: string) => void; onStatus: (value: string) => void;
}) {
  const field = 'mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
  return <div className="mb-5 flex flex-wrap items-end gap-4" dir="rtl">
    <label className="min-w-52 flex-1 text-sm text-gray-600 dark:text-gray-300">جست‌وجوی آزمون یا مدرس
      <input type="search" value={query} onChange={event => onQuery(event.target.value)} className={field} placeholder="نام آزمون، نام یا نام کاربری مدرس" />
    </label>
    <label className="text-sm text-gray-600 dark:text-gray-300">وضعیت آزمون
      <select value={status} onChange={event => onStatus(event.target.value)} className={field}>
        <option value="">بدون فیلتر وضعیت</option><option value="draft">پیش‌نویس</option><option value="upcoming">زمان‌بندی‌شده</option><option value="completed">پایان‌یافته</option>
      </select>
    </label>
    <p className="py-2 text-sm text-gray-500 dark:text-gray-400" role="status">{count.toLocaleString('fa-IR')} آزمون</p>
  </div>;
}
