import type { Exam } from '../../../api/examApi';
export default function ExamQuestionHeader({
  exam,
  count,
}: {
  exam: Exam;
  count: number;
}) {
  const status =
    exam.status === 'draft'
      ? 'پیش‌نویس'
      : exam.status === 'upcoming'
        ? 'منتشرشده'
        : 'پایان‌یافته';

  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-medium text-brand-600">
            طراحی سؤال‌های آزمون
          </p>
          <h1 className="break-words text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {exam.title}
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            {exam.category} • {exam.durationMinutes.toLocaleString('fa-IR')}{' '}
            دقیقه • {count.toLocaleString('fa-IR')} سؤال
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {status}
        </span>
      </div>
      <p className="mt-5 border-t border-gray-100 pt-4 text-sm leading-7 text-gray-500 dark:border-gray-800">
        {exam.status === 'draft'
          ? 'ابتدا سؤال‌ها را اضافه و بررسی کنید، سپس آزمون را منتشر کنید. سؤال‌های ذخیره‌شده بعد از خروج هم باقی می‌مانند.'
          : 'آزمون منتشر شده است. تغییر سؤال‌ها تا پیش از شروع اولین شرکت‌کننده امکان‌پذیر است.'}
      </p>
    </header>
  );
}
