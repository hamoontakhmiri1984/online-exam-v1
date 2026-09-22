import type { Exam } from '../../../api/examApi';
import { formatExamDateTime } from '../../../utils/formatDate';

type RecentExamsTableProps = {
  exams: Exam[];
  getParticipantCount: (examId: string) => number;
};

function RecentExamsTable({
  exams,
  getParticipantCount,
}: RecentExamsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            آزمون‌های اخیر
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            آخرین وضعیت آزمون‌های ثبت‌شده
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-150 text-right text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="px-6 py-3 font-medium">نام آزمون</th>
              <th className="px-6 py-3 font-medium">تاریخ</th>
              <th className="px-6 py-3 font-medium">شرکت‌کنندگان</th>
              <th className="px-6 py-3 font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sm text-gray-400"
                >
                  هنوز آزمونی ثبت نشده
                </td>
              </tr>
            )}
            {exams.map((exam) => (
              <tr
                key={exam.id}
                className="border-b border-gray-100 last:border-0 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition duration-200"
              >
                <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                  {exam.title}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                  {formatExamDateTime(exam.date)}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                  {getParticipantCount(exam.id).toLocaleString('fa-IR')}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      exam.status === 'completed'
                        ? 'bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-500'
                        : exam.status === 'draft'
                        ? 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400'
                        : 'bg-accent-500/10 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400'
                    }`}
                  >
                    {exam.status === 'completed'
                      ? 'پایان‌یافته'
                      : exam.status === 'draft'
                      ? 'پیش‌نویس'
                      : 'پیش‌رو'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default RecentExamsTable;
