import { Users, Pencil, Trash2, Copy, Check, RotateCw, KeyRound } from 'lucide-react';
import type { Group } from '../../../api/groupApi';

type GroupCardProps = {
  group: Group;
  isCopied: boolean;
  isRegenerating: boolean;
  onCopyCode: (group: Group) => void;
  onRegenerateCode: (group: Group) => void;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
};

function GroupCard({
  group,
  isCopied,
  isRegenerating,
  onCopyCode,
  onRegenerateCode,
  onEdit,
  onDelete,
}: GroupCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400">
          <Users size={20} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(group)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400 transition"
            title="ویرایش"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(group)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400 transition"
            title="حذف"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h2 className="font-bold text-gray-900 dark:text-white">{group.name}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {group.category}
      </p>
      <p className="mt-3 text-xs text-gray-400">
        {group.studentIds.length.toLocaleString('fa-IR')} دانشجو عضو
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <KeyRound size={14} />
          <span className="text-xs">کد عضویت</span>
        </div>
        <span className="font-mono text-sm font-bold tracking-widest text-gray-800 dark:text-white">
          {group.joinCode}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopyCode(group)}
            title="کپی کد"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-700 transition"
          >
            {isCopied ? (
              <Check size={14} className="text-success-600" />
            ) : (
              <Copy size={14} />
            )}
          </button>
          <button
            onClick={() => onRegenerateCode(group)}
            title="تولید کد جدید (کد قبلی دیگه کار نمی‌کنه)"
            disabled={isRegenerating}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            <RotateCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-400">
        این کد رو به دانشجوهات بده تا از صفحه‌ی ثبت‌نام مستقیم عضو همین گروه بشن
      </p>
    </div>
  );
}

export default GroupCard;