import { Check, Copy, IdCard, Pencil, RotateCw, Trash2, Users } from 'lucide-react';
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

const iconButton = 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2';
const cardAction = `${iconButton} text-violet-800 hover:bg-violet-200/80 focus-visible:outline-violet-700 dark:text-violet-100 dark:hover:bg-white/15 dark:focus-visible:outline-white`;
const codeAction = `${iconButton} text-violet-700 hover:bg-violet-100 focus-visible:outline-violet-700 dark:text-violet-200 dark:hover:bg-violet-400/20 dark:focus-visible:outline-violet-200`;

function GroupCard({
  group,
  isCopied,
  isRegenerating,
  onCopyCode,
  onRegenerateCode,
  onEdit,
  onDelete,
}: GroupCardProps) {
  const isPending = group.approvalStatus === 'Pending';
  const canInvite = !group.approvalStatus || group.approvalStatus === 'Approved';

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-violet-200 shadow-sm dark:border-violet-400/30">
      <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-linear-to-bl from-violet-200 via-violet-100 to-violet-50 p-4 text-violet-950 dark:from-[#624b83] dark:via-[#4f3e6c] dark:to-[#3b2f55] dark:text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -end-12 -bottom-23 -z-10 size-52 rounded-full border border-violet-400/25 shadow-[0_0_0_16px_rgba(139,92,246,.07),0_0_0_32px_rgba(139,92,246,.04)] dark:border-violet-200/25 dark:shadow-[0_0_0_16px_rgba(216,180,254,.07),0_0_0_32px_rgba(216,180,254,.04)]" />
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-violet-800 dark:text-violet-100">
            <span className="grid size-8 place-items-center rounded-lg border border-violet-300/70 bg-white/55 dark:border-white/25 dark:bg-white/10">
              <IdCard size={17} aria-hidden="true" />
            </span>
            کارت عضویت
          </span>
          <div className="flex gap-1">
            <button type="button" onClick={() => onEdit(group)} aria-label={`ویرایش گروه ${group.name}`} title="ویرایش" className={cardAction}>
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onDelete(group)} aria-label={`حذف گروه ${group.name}`} title="حذف" className={`${cardAction} hover:text-rose-700 dark:hover:text-rose-200`}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        <h2 className="mt-3 text-lg font-bold leading-snug [overflow-wrap:anywhere]">
          <bdi>{group.name}</bdi>
        </h2>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2 text-xs leading-5 text-violet-800 dark:text-violet-100">
          <bdi className="min-w-0 [overflow-wrap:anywhere]">{group.category}</bdi>
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" />
            {group.studentIds.length.toLocaleString('fa-IR')} دانشجو
          </span>
        </div>
      </div>

      <div className="flex min-h-18 min-w-0 flex-wrap items-center justify-between gap-2 border-t border-dashed border-violet-300 bg-[#fcfaff] px-4 py-2.5 dark:border-violet-400/40 dark:bg-[#231e38]">
        {canInvite ? (
          <>
            <div className="min-w-0">
              <p className="text-xs text-violet-700 dark:text-violet-200">کد عضویت</p>
              <code dir="ltr" className="block select-all text-start font-mono text-base font-bold tracking-widest text-violet-950 [overflow-wrap:anywhere] dark:text-violet-50">
                {group.joinCode}
              </code>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => onCopyCode(group)} aria-label="کپی کد عضویت" title="کپی کد عضویت" className={codeAction}>
                {isCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => onRegenerateCode(group)} aria-label="ساخت کد عضویت جدید" title="تولید کد جدید (کد قبلی دیگر کار نمی‌کند)" disabled={isRegenerating} className={`${codeAction} disabled:cursor-wait disabled:opacity-50`}>
                <RotateCw size={16} aria-hidden="true" className={isRegenerating ? 'motion-safe:animate-spin' : ''} />
              </button>
            </div>
            <span role="status" className="sr-only">{isCopied ? 'کد عضویت کپی شد' : ''}</span>
          </>
        ) : (
          <div className="min-w-0 text-xs leading-5">
            <p className="font-bold text-amber-800 dark:text-amber-200">
              {isPending ? 'منتظر تأیید مدیر' : 'تأیید نشده'}
            </p>
            <p className="text-slate-700 dark:text-slate-200">
              {isPending ? 'عضویت و استفاده از گروه پس از تأیید مدیر فعال می‌شود.' : 'برای بررسی مجدد با مدیر تماس بگیرید.'}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export default GroupCard;
