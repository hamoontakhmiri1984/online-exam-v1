import Spinner from '../../components/Spinner/Spinner';
import { useState } from 'react';
import { Bell, BellRing, CheckCheck, Trash2, RefreshCw, Info, Users, Award } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import ConfirmDeleteModal from '../../components/Modal/ConfirmDeleteModal';
import useNotifications from '../../hooks/useNotifications';
import type { Notification } from '../../api/notificationApi';

const ICONS = { info: Info, people: Users, award: Award };

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, deleteError, deletingIds, deletingAll, markOneRead, markAllRead, removeNotification, removeAllNotifications, refresh } = useNotifications();
  const [filter, setFilter] = useState<'all'|'unread'|'read'>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const items = notifications.filter(n => filter === 'all' || (filter === 'unread' ? !n.read : n.read));

  return (
    <AppLayout title="همه اعلان‌ها">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><BellRing size={25} className="text-violet-600 dark:text-violet-300"/> همه اعلان‌ها</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{notifications.length.toLocaleString('fa-IR')} اعلان · {unreadCount.toLocaleString('fa-IR')} خوانده‌نشده</p>
        </div>
        <button type="button" aria-label="تازه‌سازی اعلان‌ها" onClick={refresh} disabled={loading} className="rounded-xl border border-violet-200 bg-white/75 p-2.5 text-violet-700 disabled:opacity-50 dark:border-violet-400/25 dark:bg-gray-900 dark:text-violet-200"><RefreshCw size={17}/></button>
      </div>
      {deleteError && <p role="alert" className="form-inline-error mb-4">{deleteError}</p>}
      <div role="group" aria-label="فیلتر وضعیت اعلان‌ها" className="mb-5 flex flex-wrap gap-2">
        {(['all', 'unread', 'read'] as const).map(key => (
          <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filter === key ? 'border-violet-500 bg-violet-600 text-white' : 'border-violet-200 bg-white/70 text-violet-700 dark:border-violet-400/25 dark:bg-gray-900 dark:text-violet-200'}`}>
            {key === 'all' ? 'همه' : key === 'unread' ? 'خوانده‌نشده' : 'خوانده‌شده'}
          </button>
        ))}
      </div>
      <div className="ui-admin-table overflow-x-auto rounded-2xl border border-violet-200/50 bg-white/85 shadow-sm dark:border-violet-400/15 dark:bg-gray-900/85" aria-busy={loading}>
        <table className="w-full min-w-[680px] text-right text-sm">
          <thead>
            <tr>
              <th scope="col">اعلان</th>
              <th scope="col">تاریخ</th>
              <th scope="col">وضعیت</th>
              <th scope="col"><span className="sr-only">عملیات</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((notification: Notification) => {
              const Icon = ICONS[notification.icon] ?? Info;
              return (
                <tr key={notification.id} className={notification.read ? '' : 'bg-violet-50/60 dark:bg-violet-500/10'}>
                  <td>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"><Icon size={18}/></span>
                      <span className="min-w-0 break-words font-semibold text-gray-800 dark:text-gray-100">{notification.title}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400"><time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString('fa-IR')}</time></td>
                  <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${notification.read ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'}`}>{notification.read ? 'خوانده‌شده' : 'خوانده‌نشده'}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      {!notification.read && <button type="button" onClick={() => void markOneRead(notification.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-500/15">خواندم</button>}
                      <button type="button" aria-label={`حذف اعلان ${notification.title}`} disabled={deletingIds.includes(notification.id) || deletingAll} onClick={() => void removeNotification(notification.id)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <Spinner label="در حال دریافت اعلان‌ها…" />}
        {!loading && !items.length && <div className="flex flex-col items-center gap-3 px-5 py-12 text-sm text-gray-500"><Bell size={26} className="text-violet-400"/> اعلانی در این بخش وجود ندارد.</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-200/50 bg-violet-50/30 px-4 py-4 dark:border-violet-400/15 dark:bg-violet-500/5">
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-200">{unreadCount.toLocaleString('fa-IR')} خوانده‌نشده</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={loading || !unreadCount} onClick={() => void markAllRead()} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-violet-700 disabled:opacity-40 dark:border-violet-400/25 dark:bg-gray-900 dark:text-violet-200"><CheckCheck size={17}/>خواندن همه</button>
            <button type="button" disabled={loading || deletingAll || !notifications.length} onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-rose-700 disabled:opacity-40 dark:border-rose-400/25 dark:bg-gray-900 dark:text-rose-300"><Trash2 size={16}/>{deletingAll ? 'در حال پاک کردن…' : 'پاک کردن همه'}</button>
          </div>
        </div>
      </div>
      <ConfirmDeleteModal isOpen={confirmClear} title="پاک‌کردن همه اعلان‌ها"
        description="همه اعلان‌های این حساب از فهرست شما حذف شوند؟"
        busy={deletingAll} error={deleteError ?? undefined}
        onConfirm={async () => { if (await removeAllNotifications()) setConfirmClear(false); }}
        onClose={() => { if (!deletingAll) setConfirmClear(false); }}/>
    </AppLayout>
  );
}
