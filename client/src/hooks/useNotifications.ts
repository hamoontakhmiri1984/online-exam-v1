import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../api/authApi';
import {
  getNotificationsForUser,
  deleteNotification,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '../api/notificationApi';

// جای state داخلی AppLayout رو می‌گیره - از api/notificationApi.ts (که خودش
// تو localStorage پرسیستشون می‌کنه) می‌خونه، پس با تعویض صفحه یا رفرش،
// وضعیت خونده/نخونده از دست نمی‌ره
function useNotifications() {
  const currentUser = getCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const removedIds = useRef(new Set<string>());
  const pendingDeletes = useRef(new Set<string>());
  const owner = useRef(currentUser?.id);
  owner.current = currentUser?.id;

  // آخرین درخواستِ در حال اجرا؛ اگه بین‌راه درخواست جدیدی (مثلاً refresh با
  // باز کردن پنل) شروع بشه، جوابِ قدیمی‌تر نادیده گرفته می‌شه
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    // قبلاً catch نداشت: هر خطای شبکه یه unhandled rejection می‌شد.
    // اعلان‌ها حیاتی نیستن، پس موقع خطا همون لیست قبلی می‌مونه.
    getNotificationsForUser(currentUser.id, currentUser.role)
      .then((data) => {
        if (requestId === requestIdRef.current) setNotifications(data.filter(item => !removedIds.current.has(item.id)));
      })
      .catch(() => {})
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    owner.current = currentUser?.id;
    removedIds.current.clear();
    pendingDeletes.current.clear();
    setNotifications([]);
    setDeletingIds([]);
    setDeleteError(null);
    load();

    return () => {
      // جلوگیری از setState بعد از unmount
      requestIdRef.current += 1;
      owner.current = undefined;
    };
  }, [load]);

  async function removeNotification(id: string) {
    if (pendingDeletes.current.has(id)) return;
    const userId = currentUser?.id;
    pendingDeletes.current.add(id);
    setDeletingIds([...pendingDeletes.current]);
    setDeleteError(null);
    try {
      await deleteNotification(id);
      if (owner.current !== userId) return;
      removedIds.current.add(id);
      setNotifications(items => items.filter(item => item.id !== id));
    } catch {
      if (owner.current === userId) setDeleteError('حذف اعلان انجام نشد؛ دوباره تلاش کنید.');
    } finally {
      pendingDeletes.current.delete(id);
      if (owner.current === userId) setDeletingIds([...pendingDeletes.current]);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markOneRead(id: string) {
    // کلیک روی اعلانِ از قبل خونده‌شده نباید درخواست الکی بفرسته
    if (notifications.find((n) => n.id === id)?.read !== false) return;

    markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function markAllRead() {
    markAllNotificationsRead(notifications.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return {
    notifications,
    unreadCount,
    loading,
    markOneRead,
    markAllRead,
    refresh: load,
    removeNotification, deleteError, deletingIds,
  };
}

export default useNotifications;
