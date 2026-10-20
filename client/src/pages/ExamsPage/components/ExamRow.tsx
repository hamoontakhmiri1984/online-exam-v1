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
  isObserver?: boolean;
  canTake?: boolean;
  selected?: boolean;
  onSelect?: () => void;
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
  isObserver = false,
  canTake = false,
  selected = false,
  onSelect,
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
    <tr
      tabIndex={onSelect ? 0 : undefined}
      aria-selected={onSelect ? selected : undefined}
      onClick={onSelect ? (event) => {
        if (!(event.target as HTMLElement).closest('button, a, input, select')) onSelect();
      } : undefined}
      onKeyDown={onSelect ? (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      } : undefined}
      className={`border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 transition-colors duration-150 motion-reduce:transition-none
        ${onSelect ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:-outline-offset-2' : ''}
        ${selected && onSelect
          ? 'bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-950/70'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
    >
      <td className="py-3">{exam.title}</td>
      {isObserver && <td className="py-3">{exam.instructor?.name?.trim() || exam.instructor?.username || 'مدرس بدون نام'}</td>}
      <td className="py-3">{exam.category}</td>
      <td className="py-3">{formatExamDateTime(exam.date)}</td>
      {(canManage || isObserver) && (
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

          {canTake && exam.status !== 'draft' && (
            <button
              onClick={() => onTake(exam)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-success-500/10 hover:text-success-600 dark:text-gray-400 dark:hover:bg-success-500/15 dark:hover:text-success-500 transition"
              title="شروع آزمون"
            >
              <PlayCircle size={16} />
            </button>
          )}
          {isObserver && (
            <button onClick={() => onOpenQuestions(exam)} className="cursor-pointer rounded-lg px-3 py-2 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40">مشاهده سؤال‌ها</button>
          )}
          {canManage && (
            <>
              <button
                onClick={() => onOpenQuestions(exam)}
                className="flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-gray-500 hover:bg-accent-500/10 hover:text-accent-600 dark:text-gray-400 dark:hover:bg-accent-500/15 dark:hover:text-accent-500 transition"
                title="سوال‌های آزمون"
              >
                <ListChecks size={16} />
                سؤال‌ها
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
