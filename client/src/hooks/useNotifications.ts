import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../api/authApi';
import {
  getNotificationsForUser,
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
        if (requestId === requestIdRef.current) setNotifications(data);
      })
      .catch(() => {})
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    load();

    return () => {
      // جلوگیری از setState بعد از unmount
      requestIdRef.current += 1;
    };
  }, [load]);

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
  };
}

export default useNotifications;
