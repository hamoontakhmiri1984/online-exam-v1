import { toPersianDigits } from '../../../utils/persianDigits';
import { Search, ClipboardList } from 'lucide-react';
import UiSelect from '../../../components/UiSelect';
import type { Exam } from '../../../api/examApi';
export function filterOversightExams(exams: Exam[], query: string, status: string) {
  const term = query.trim().toLocaleLowerCase('fa-IR');
  return exams.filter(exam => (!status || exam.status === status) &&
    [exam.title, exam.instructor?.name, exam.instructor?.username].some(value => value?.toLocaleLowerCase('fa-IR').includes(term)));
}
export default function ExamOversightFilters({ query, status, count, onQuery, onStatus }: {
  query: string; status: string; count: number; onQuery: (value: string) => void; onStatus: (value: string) => void;
}) {
  const field = 'mt-2 h-11 w-full rounded-xl border border-violet-200/70 bg-white/80 px-4 text-sm text-gray-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-violet-400/20 dark:bg-slate-800/75 dark:text-gray-100';
  return <div className="mb-5 flex flex-wrap items-end gap-4" dir="rtl">
    <label className="min-w-52 flex-1 text-sm text-gray-600 dark:text-gray-300">جستجو
      <div className="relative"><Search size={16} className="pointer-events-none absolute right-3 top-[25px] text-gray-400" /><input type="search" value={query} onChange={event => onQuery(event.target.value)} className={`${field} pr-10`} placeholder="نام آزمون، نام یا نام کاربری مدرس" /></div>
    </label>
    <label className="text-sm text-gray-600 dark:text-gray-300">وضعیت آزمون
      <div className="relative mt-2 min-w-48"><UiSelect value={status} onChange={event => onStatus(event.target.value)} aria-label="وضعیت آزمون" className="w-full">
        <option value="">بدون فیلتر وضعیت</option><option value="draft">پیش‌نویس</option><option value="upcoming">زمان‌بندی‌شده</option><option value="completed">پایان‌یافته</option>
      </UiSelect></div>
    </label>
    <p className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200/60 bg-violet-50/70 px-4 text-sm font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200" role="status"><ClipboardList size={16}/>{toPersianDigits(count.toLocaleString('fa-IR'))} آزمون</p>
  </div>;
}
