import {
  FileText,
  GraduationCap,
  CheckCircle2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { Exam } from '../../../api/examApi';
import type { Student } from '../../../api/studentApi';
import type { ExamAttempt } from '../../../api/examAttemptApi';

function SummaryCards({
  exams,
  students,
  attempts,
}: {
  exams: Exam[];
  students: Student[];
  attempts: ExamAttempt[];
}) {
  const completedCount = exams.filter((e) => e.status === 'completed').length;

  const averageScorePercent = attempts.length
    ? Math.round(
        (attempts.reduce(
          (sum, a) => sum + a.correctCount / (a.totalQuestions || 1),
          0
        ) /
          attempts.length) *
          100
      )
    : 0;

  const cards: { label: string; value: string; icon: LucideIcon; bg: string }[] = [
    {
      label: 'کل آزمون‌ها',
      value: exams.length.toLocaleString('fa-IR'),
      icon: FileText,
      bg: 'bg-brand-600',
    },
    {
      label: 'کل دانشجویان',
      value: students.length.toLocaleString('fa-IR'),
      icon: GraduationCap,
      bg: 'bg-gray-500',
    },
    {
      label: 'آزمون‌های پایان‌یافته',
      value: completedCount.toLocaleString('fa-IR'),
      icon: CheckCircle2,
      bg: 'bg-success-600',
    },
    {
      label: 'میانگین نمره',
      value: `${averageScorePercent.toLocaleString('fa-IR')}٪`,
      icon: TrendingUp,
      bg: 'bg-accent-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, bg }) => (
        <div
          key={label}
          className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div
            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${bg}`}
          >
            <Icon size={20} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;