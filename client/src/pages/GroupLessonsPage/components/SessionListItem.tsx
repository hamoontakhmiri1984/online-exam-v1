import { Pencil, Trash2, PlayCircle } from 'lucide-react';
import type { LessonSession } from '../../../api/lessonApi';

type SessionListItemProps = {
  session: LessonSession;
  index: number;
  isActive: boolean;
  canManage: boolean;
  onSelect: (session: LessonSession) => void;
  onEdit: (session: LessonSession) => void;
  onDelete: (session: LessonSession) => void;
};

function SessionListItem({
  session,
  index,
  isActive,
  canManage,
  onSelect,
  onEdit,
  onDelete,
}: SessionListItemProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
        isActive
          ? 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/30'
          : 'border-gray-100 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(session)}
        aria-current={isActive ? 'true' : undefined}
        className="flex flex-1 items-center gap-3 text-right"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {(index + 1).toLocaleString('fa-IR')}
        </span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {session.title}
        </span>
        <PlayCircle
          size={16}
          className="mr-auto shrink-0 text-gray-300 dark:text-gray-600"
        />
      </button>

      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`ویرایش ${session.title}`}
            onClick={() => onEdit(session)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400 transition"
            title="ویرایش"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label={`حذف ${session.title}`}
            onClick={() => onDelete(session)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400 transition"
            title="حذف"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default SessionListItem;
