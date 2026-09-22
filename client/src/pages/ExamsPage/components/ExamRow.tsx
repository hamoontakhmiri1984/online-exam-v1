import {
  Pencil,
  Trash2,
  PlayCircle,
  ListChecks,
  UploadCloud,
  Undo2,
} from 'lucide-react';
import type { Exam } from '../../../api/examApi';
import { formatExamDateTime } from '../../../utils/formatDate';

type ExamRowProps = {
  exam: Exam;
  canManage: boolean;
  participantCount: number;
  onTake: (exam: Exam) => void;
  onOpenQuestions: (exam: Exam) => void;
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => void;
  onPublish: (exam: Exam) => void;
  onUnpublish: (exam: Exam) => void;
};

const STATUS_BADGE: Record<
  Exam['status'],
  { label: string; className: string }
> = {
  draft: {
    label: 'پیش‌نویس',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  upcoming: {
    label: 'زمان‌بندی‌شده',
    className:
      'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  },
  completed: {
    label: 'پایان‌یافته',
    className:
      'bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  },
};

function ExamRow({
  exam,
  canManage,
  participantCount,
  onTake,
  onOpenQuestions,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
}: ExamRowProps) {
  const badge = STATUS_BADGE[exam.status];

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 transition duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="py-3">{exam.title}</td>
      <td className="py-3">{exam.category}</td>
      <td className="py-3">{formatExamDateTime(exam.date)}</td>
      {canManage && (
        <td className="py-3">{participantCount.toLocaleString('fa-IR')}</td>
      )}
      <td className="py-3">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          {/* فقط دانشجو می‌تونه آزمون بده (روت /exams/:examId/take و سرور هر دو
              Student-only ـن)؛ برای مدرس/ادمین این دکمه فقط به داشبورد برمی‌گردوند */}
          {!canManage && exam.status !== 'draft' && (
            <button
              onClick={() => onTake(exam)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-success-500/10 hover:text-success-600 dark:text-gray-400 dark:hover:bg-success-500/15 dark:hover:text-success-500 transition"
              title="شروع آزمون"
            >
              <PlayCircle size={16} />
            </button>
          )}
          {canManage && (
            <>
              <button
                onClick={() => onOpenQuestions(exam)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-accent-500/10 hover:text-accent-600 dark:text-gray-400 dark:hover:bg-accent-500/15 dark:hover:text-accent-500 transition"
                title="سوال‌های آزمون"
              >
                <ListChecks size={16} />
              </button>
              {exam.status === 'draft' && (
                <button
                  onClick={() => onPublish(exam)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400 transition"
                  title="انتشار آزمون"
                >
                  <UploadCloud size={16} />
                </button>
              )}
              {exam.status === 'upcoming' && (
                <button
                  onClick={() => onUnpublish(exam)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-accent-500/10 hover:text-accent-600 dark:text-gray-400 dark:hover:bg-accent-500/15 dark:hover:text-accent-500 transition"
                  title="لغو انتشار (برگردوندن به پیش‌نویس)"
                >
                  <Undo2 size={16} />
                </button>
              )}
              <button
                onClick={() => onEdit(exam)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400 transition"
                title="ویرایش"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(exam)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400 transition"
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default ExamRow;
