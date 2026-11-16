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
  hasFinished?: boolean;
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
      'bg-brand-50 text-brand-ink dark:bg-brand-950/40',
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
  hasFinished = false,
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
          ? 'bg-violet-100/80 dark:bg-violet-700/25 hover:bg-violet-100 dark:hover:bg-violet-700/30 ring-1 ring-inset ring-violet-300/35'
          : 'hover:bg-violet-50/70 dark:hover:bg-violet-900/20'}`}
    >
      <td className="px-3 py-4">{exam.title}</td>
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
        <div className="flex min-w-max items-center justify-end gap-1.5" aria-label="عملیات آزمون">
          {canManage ? (
            <>
              <button type="button" onClick={() => onOpenQuestions(exam)}
                className="inline-flex h-9 w-22 items-center justify-center gap-1 rounded-lg text-xs font-semibold text-brand-ink transition hover:bg-violet-100 dark:hover:bg-violet-500/15"
                title="سؤال‌های آزمون"><ListChecks size={16}/> سؤال‌ها</button>
              <button type="button" onClick={() => exam.status === 'draft' ? onPublish(exam) : onUnpublish(exam)}
                disabled={exam.status === 'completed'}
                aria-label={exam.status === 'draft' ? 'انتشار آزمون' : 'لغو انتشار'}
                title={exam.status === 'completed' ? 'آزمون پایان یافته و امکان تغییر انتشار ندارد' : exam.status === 'draft' ? 'انتشار آزمون' : 'لغو انتشار'}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-ink transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-25 dark:hover:bg-violet-500/15">
                {exam.status === 'draft' ? <UploadCloud size={16}/> : <Undo2 size={16}/>}
              </button>
              <button type="button" onClick={() => onEdit(exam)} title="ویرایش" aria-label="ویرایش آزمون"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-violet-100 hover:text-brand-ink dark:text-gray-400 dark:hover:bg-violet-500/15"><Pencil size={16}/></button>
              <button type="button" onClick={() => onDelete(exam)} title="حذف" aria-label="حذف آزمون"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10"><Trash2 size={16}/></button>
            </>
          ) : isObserver ? (
            <button type="button" onClick={() => onOpenQuestions(exam)}
              className="inline-flex h-9 w-29 items-center justify-center rounded-lg text-xs font-semibold text-brand-ink transition hover:bg-violet-50 dark:hover:bg-violet-500/10"><ListChecks size={16}/> مشاهده سؤال‌ها</button>
          ) : (
            <button type="button" onClick={() => onTake(exam)}
              disabled={!canTake || hasFinished || exam.status === 'draft' || exam.status === 'completed'}
              title={hasFinished ? 'این آزمون را قبلاً به پایان رسانده‌اید' : exam.status === 'draft' ? 'آزمون هنوز منتشر نشده' : exam.status === 'completed' ? 'آزمون پایان یافته' : 'شروع آزمون'}
              className="inline-flex h-9 min-w-28 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"><PlayCircle size={16}/>{hasFinished ? 'انجام‌شده' : 'شروع آزمون'}</button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default ExamRow;
