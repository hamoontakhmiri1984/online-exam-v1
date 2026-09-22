import { useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Info,
  Users as UsersIcon,
  Award,
  type LucideIcon,
} from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
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
  const { notifications, unreadCount, markOneRead, markAllRead, refresh } =
    useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(panelRef, () => setIsOpen(false), isOpen);

  // لیست فقط یه‌بار موقع mount گرفته می‌شد و اعلان‌های جدید (تا رفرش صفحه)
  // هیچ‌وقت نمی‌رسید؛ هر بار که پنل باز می‌شه لیست تازه می‌شه
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
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition duration-200 hover:scale-105 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Bell size={16} />

        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount.toLocaleString(
              'fa-IR'
            )} اعلان خوانده‌نشده`}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] text-white"
          >
            {unreadCount.toLocaleString('fa-IR')}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="اعلان‌ها"
          className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              اعلان‌ها
            </h3>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
              >
                <CheckCheck size={13} />
                خواندن همه
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                اعلان جدیدی نداری
              </p>
            ) : (
              notifications.map((notification: Notification) => {
                const style = NOTIFICATION_STYLES[notification.icon];

                if (!style) {
                  return null;
                }

                const { Icon, iconBg } = style;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markOneRead(notification.id)}
                    aria-label={
                      notification.read
                        ? notification.title
                        : `${notification.title}، خوانده‌نشده`
                    }
                    className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-right transition last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-800/50 ${
                      notification.read
                        ? ''
                        : 'bg-brand-50/40 dark:bg-brand-600/5'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                    >
                      <Icon size={15} />
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
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;
