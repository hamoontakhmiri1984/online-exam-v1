import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Trash2,
  LoaderCircle,
  CheckCheck,
  List,
  BellRing,
  Info,
  Users as UsersIcon,
  Award,
  type LucideIcon,
} from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import ConfirmDeleteModal from '../Modal/ConfirmDeleteModal';
import useOnClickOutside from '../../hooks/useOnClickOutside';
import type { Notification } from '../../api/notificationApi';

const NOTIFICATION_STYLES: Record<
  Notification['icon'],
  { Icon: LucideIcon; iconBg: string }
> = {
  info: {
    Icon: Info,
    iconBg:
      'bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400',
  },
  people: {
    Icon: UsersIcon,
    iconBg:
      'bg-accent-500/10 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500',
  },
  award: {
    Icon: Award,
    iconBg:
      'bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  },
};

function formatRelativeTime(iso: string): string {
  const timestamp = new Date(iso).getTime();

  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diffMs = Math.max(0, Date.now() - timestamp);

  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'همین الان';
  if (minutes < 60) {
    return `${minutes.toLocaleString('fa-IR')} دقیقه پیش`;
  }
  if (hours < 24) {
    return `${hours.toLocaleString('fa-IR')} ساعت پیش`;
  }
  if (days === 1) return 'دیروز';

  return `${days.toLocaleString('fa-IR')} روز پیش`;
}

function NotificationsPanel() {
  const { notifications, unreadCount, markOneRead, markAllRead, refresh, removeNotification, removeAllNotifications, deletingAll, deleteError, deletingIds, loading } =
    useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();
  const recentNotifications = notifications.slice(0, 5);
  const panelRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(panelRef, () => setIsOpen(false), isOpen);

  function togglePanel() {
    if (!isOpen) refresh();
    setIsOpen((prev) => !prev);
  }

  return (
    <div
      className="relative"
      ref={panelRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsOpen(false);
      }}
    >
      <button
        type="button"
        aria-label="نمایش اعلان‌ها"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={togglePanel}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${unreadCount ? "border-violet-300/60 bg-violet-100 text-violet-700 shadow-sm shadow-violet-300/20 dark:border-violet-400/40 dark:bg-violet-500/20 dark:text-violet-200" : "border-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"}`}
      >
        {unreadCount ? <BellRing size={21} strokeWidth={2.2} /> : <Bell size={19} strokeWidth={1.9} />}

        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount.toLocaleString(
              'fa-IR'
            )} اعلان خوانده‌نشده`}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 ring-2 ring-white text-[10px] dark:ring-gray-900 text-white"
          >
            {unreadCount.toLocaleString('fa-IR')}
          </span>
        )}
      </button>

      <ConfirmDeleteModal isOpen={confirmClear} title="پاک‌کردن همه اعلان‌ها"
        description="همه اعلان‌های این حساب از فهرست شما پاک شوند؟ اعلان‌های سایر کاربران تغییر نمی‌کنند."
        busy={deletingAll} error={deleteError ?? undefined}
        onConfirm={async () => { if (await removeAllNotifications()) setConfirmClear(false); }}
        onClose={() => { if (!deletingAll) setConfirmClear(false); }} />
      {isOpen && (
        <div
          role="dialog"
          aria-label="اعلان‌ها"
          className="absolute left-0 top-full z-50 mt-2 w-90 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-violet-200/50 bg-white/95 shadow-xl shadow-violet-950/10 backdrop-blur-xl dark:border-violet-400/20 dark:bg-gray-900/95"
        >
          <div className="flex items-center justify-between border-b border-violet-100/70 px-4 py-3.5 dark:border-violet-400/15">
            <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">اعلان‌ها <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">{unreadCount.toLocaleString('fa-IR')} خوانده‌نشده</span></h3>


          </div>

          {deleteError && <p role="alert" className="px-4 py-2 text-xs text-danger-600 dark:text-danger-400">{deleteError}</p>}
          {loading && <p role="status" className="px-4 py-2 text-xs text-gray-500">در حال دریافت اعلان‌ها…</p>}
          <div className="max-h-72 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                اعلان جدیدی نداری
              </p>
            ) : (
              recentNotifications.map((notification: Notification) => {
                const style = NOTIFICATION_STYLES[notification.icon];

                if (!style) {
                  return null;
                }

                const { Icon, iconBg } = style;

                return (
                  <div key={notification.id} className="flex items-center border-b border-violet-100/50 last:border-0 dark:border-violet-400/10">
                  <button
                    type="button"
                    onClick={() => markOneRead(notification.id)}
                    aria-label={
                      notification.read
                        ? notification.title
                        : `${notification.title}، خوانده‌نشده`
                    }
                    className={`flex min-w-0 flex-1 items-start gap-3 border-b border-gray-50 px-4 py-3 text-right transition last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-800/50 ${
                      notification.read
                        ? ''
                        : 'bg-brand-50/40 dark:bg-brand-600/5'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/10 shadow-sm ${iconBg}`}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-xs leading-5 text-gray-700 dark:text-gray-200">
                        {notification.title}
                      </span>

                      <span className="mt-0.5 block text-[11px] text-gray-400">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </span>

                    {!notification.read && (
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                      />
                    )}
                  </button>
                  <button type="button" aria-label={`حذف اعلان: ${notification.title}`} title="حذف اعلان"
                    disabled={deletingIds.includes(notification.id)}
                    onClick={() => void removeNotification(notification.id)}
                    className="me-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50 dark:hover:bg-rose-500/10">
                    {deletingIds.includes(notification.id) ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-violet-100/70 bg-violet-50/25 px-3 py-2.5 dark:border-violet-400/15 dark:bg-violet-500/5">
            <button type="button" disabled={unreadCount === 0 || loading} onClick={markAllRead} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-40 dark:text-violet-200 dark:hover:bg-violet-500/10"><CheckCheck size={15}/>خواندن همه</button>
            <button type="button" disabled={!notifications.length || deletingAll || loading} onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-500/10"><Trash2 size={14}/>{deletingAll ? 'در حال پاک کردن…' : 'پاک کردن همه'}</button>
          </div>
          <button type="button" onClick={() => { setIsOpen(false); navigate('/notifications'); }} className="flex w-full items-center justify-center gap-2 border-t border-violet-100/70 bg-transparent px-4 py-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-400/15 dark:text-violet-200 dark:hover:bg-violet-500/10"><List size={17}/> مشاهده همه اعلان‌ها</button>
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;
