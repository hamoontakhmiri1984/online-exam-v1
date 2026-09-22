import { TimerOff } from 'lucide-react';
import type { Exam } from '../../../api/examApi';
import type { Student } from '../../../api/studentApi';
import {
  isFinishedAttempt,
  type ExamAttempt,
} from '../../../api/examAttemptApi';

function RecentAttemptsTable({
  exams,
  attempts,
  students,
}: {
  exams: Exam[];
  attempts: ExamAttempt[];
  students: Student[];
}) {
  const recentAttempts = attempts
    .filter(isFinishedAttempt)
    .sort(
      (a, b) =>
        new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
    )
    .slice(0, 8);

  function examTitle(examId: string) {
    return exams.find((e) => e.id === examId)?.title ?? 'آزمون حذف‌شده';
  }

  function studentName(studentId: string) {
    return students.find((s) => s.id === studentId)?.name ?? 'دانشجوی حذف‌شده';
  }

  return (
    <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
        آخرین تلاش‌های ثبت‌شده
      </h2>

      {recentAttempts.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          هنوز هیچ آزمونی توسط دانشجویی به پایان نرسیده
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-150 text-right text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2">دانشجو</th>
                <th className="py-2">آزمون</th>
                <th className="py-2">نمره</th>
                <th className="py-2">تاریخ</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((attempt) => (
                <tr
                  key={attempt.id}
                  className="border-b border-gray-100 text-gray-700 transition duration-200 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 font-medium">
                    {studentName(attempt.studentId)}
                  </td>
                  <td className="py-3 text-gray-500 dark:text-gray-400">
                    {examTitle(attempt.examId)}
                  </td>
                  <td className="py-3">
                    <span className="inline-flex rounded-full bg-success-500/10 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                      {attempt.correctCount.toLocaleString('fa-IR')} از{' '}
                      {attempt.totalQuestions.toLocaleString('fa-IR')}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 dark:text-gray-400">
                    {new Date(attempt.finishedAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="py-3">
                    {attempt.endedByTimeout && (
                      <span
                        title="با اتمام وقت به پایان رسید"
                        className="inline-flex items-center gap-1 text-xs text-danger-500"
                      >
                        <TimerOff size={13} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecentAttemptsTable;
