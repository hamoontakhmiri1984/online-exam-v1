import type { CSSProperties } from 'react';
import { Check, Copy, IdCard, Pencil, RotateCw, Trash2, Users } from 'lucide-react';
import { GROUP_CARD_DEFAULT_COLOR, GROUP_CARD_THEMES } from '../../../constants/groupCardColors';
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
const cardAction = iconButton + ' text-[var(--group-card-accent)] hover:bg-[var(--group-card-accent-soft)] focus-visible:outline-[var(--group-card-accent)] dark:text-[var(--group-card-accent-dark)] dark:hover:bg-white/15 dark:focus-visible:outline-white';
const codeAction = iconButton + ' text-[var(--group-card-accent)] hover:bg-[var(--group-card-accent-soft)] focus-visible:outline-[var(--group-card-accent)] dark:text-[var(--group-card-accent-dark)] dark:hover:bg-white/15 dark:focus-visible:outline-white';

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
  const palette = GROUP_CARD_THEMES[group.cardColor ?? GROUP_CARD_DEFAULT_COLOR];
  const themeStyle = {
    '--group-card-border': palette.border, '--group-card-border-dark': palette.borderDark,
    '--group-card-face': palette.face, '--group-card-face-dark': palette.faceDark,
    '--group-card-ink': palette.ink, '--group-card-ink-dark': palette.inkDark,
    '--group-card-muted': palette.muted, '--group-card-muted-dark': palette.mutedDark,
    '--group-card-accent': palette.accent, '--group-card-accent-dark': palette.accentDark,
    '--group-card-accent-soft': palette.accentSoft,
    '--group-card-icon-border': palette.iconBorder, '--group-card-icon-border-dark': palette.iconBorderDark,
    '--group-card-icon-bg': palette.iconBg, '--group-card-icon-bg-dark': palette.iconBgDark,
    '--group-card-footer-border': palette.footerBorder, '--group-card-footer-border-dark': palette.footerBorderDark,
    '--group-card-footer-bg': palette.footerBg, '--group-card-footer-bg-dark': palette.footerBgDark,
  } as CSSProperties;

  return (
    <article style={themeStyle} className="app-panel-card app-panel-card--interactive flex min-w-0 flex-col overflow-hidden border border-[var(--group-card-border)] dark:border-[var(--group-card-border-dark)]">
      <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-[var(--group-card-face)] p-4 text-[var(--group-card-ink)] dark:bg-[var(--group-card-face-dark)] dark:text-[var(--group-card-ink-dark)]">
        <div aria-hidden="true" className="pointer-events-none absolute -end-12 -bottom-23 -z-10 size-52 rounded-full border border-[var(--group-card-border)] shadow-[0_0_0_16px_rgba(100,116,139,.06),0_0_0_32px_rgba(100,116,139,.035)] dark:border-[var(--group-card-border-dark)] dark:shadow-[0_0_0_16px_rgba(226,232,240,.06),0_0_0_32px_rgba(226,232,240,.035)]" />
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--group-card-muted)] dark:text-[var(--group-card-muted-dark)]">
            <span className="grid size-8 place-items-center rounded-lg border border-[var(--group-card-icon-border)] bg-[var(--group-card-icon-bg)] dark:border-[var(--group-card-icon-border-dark)] dark:bg-[var(--group-card-icon-bg-dark)]">
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
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2 text-xs leading-5 text-[var(--group-card-muted)] dark:text-[var(--group-card-muted-dark)]">
          <bdi className="min-w-0 [overflow-wrap:anywhere]">{group.category}</bdi>
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" />
            {group.studentIds.length.toLocaleString('fa-IR')} دانشجو
          </span>
        </div>
      </div>

      <div className="flex min-h-18 min-w-0 flex-wrap items-center justify-between gap-2 border-t border-dashed border-[var(--group-card-footer-border)] bg-[var(--group-card-footer-bg)] px-4 py-2.5 dark:border-[var(--group-card-footer-border-dark)] dark:bg-[var(--group-card-footer-bg-dark)]">
        {canInvite ? (
          <>
            <div className="min-w-0">
              <p className="text-xs text-brand-ink">کد عضویت</p>
              <code dir="ltr" className="block select-all text-start font-mono text-base font-bold tracking-widest text-[var(--group-card-ink)] [overflow-wrap:anywhere] dark:text-[var(--group-card-ink-dark)]">
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
