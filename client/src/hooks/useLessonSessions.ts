import { useEffect, useState } from 'react';
import {
  getSessionsByGroupId,
  addSession,
  updateSession,
  deleteSession,
  type LessonSession,
} from '../api/lessonApi';
import { ApiError } from '../lib/apiClient';

type SessionInput = Omit<LessonSession, 'id'>;

type UseLessonSessionsParams = {
  groupId: string | undefined;
  // فقط وقتی گروه لود شده و کاربر بهش دسترسی داره جلسات رو بگیر
  enabled: boolean;
};

// پیام خطای سرور (مثلاً «فایل انتخاب‌شده متعلق به تو نیست» یا خطای اعتبارسنجی)
// رو نشون می‌ده؛ قبلاً همیشه یه پیام عمومی نشون داده می‌شد و مدرس نمی‌فهمید
// چرا ذخیره نشد
function errorMessageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback;
}

function useLessonSessions({ groupId, enabled }: UseLessonSessionsParams) {
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // فقط id رو نگه می‌داریم، نه خودِ آبجکت جلسه. قبلاً activeSession یه کپی
  // بود: بعد از ویرایش جلسه‌ی در حال پخش، پلیر هنوز عنوان/ویدیوی قدیمی رو
  // نشون می‌داد، و بعد از حذفش (یا اضافه‌کردن اولین جلسه) پلیر خالی می‌موند
  // درحالی‌که لیست پر بود.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !enabled) return;

    let cancelled = false;
    setLoading(true);

    getSessionsByGroupId(groupId)
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        setActiveSessionId(data[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('دریافت جلسات با خطا مواجه شد');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, enabled]);

  // اگه id انتخاب‌شده دیگه تو لیست نیست (مثلاً حذف شده)، اولین جلسه‌ی لیست
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;

  function setActiveSession(session: LessonSession | null) {
    setActiveSessionId(session?.id ?? null);
  }

  async function addItem(
    input: SessionInput
  ): Promise<LessonSession | undefined> {
    setError(null);

    try {
      const created = await addSession(input);
      setSessions((prev) => [...prev, created]);
      return created;
    } catch (err) {
      setError(errorMessageOf(err, 'ذخیره جلسه با خطا مواجه شد'));
      return undefined;
    }
  }

  async function updateItem(
    id: string,
    input: SessionInput
  ): Promise<LessonSession | undefined> {
    setError(null);

    try {
      const updated = await updateSession(id, input);
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err) {
      setError(errorMessageOf(err, 'ذخیره جلسه با خطا مواجه شد'));
      return undefined;
    }
  }

  async function deleteItem(id: string): Promise<boolean> {
    setError(null);

    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      setError(errorMessageOf(err, 'حذف جلسه با خطا مواجه شد'));
      return false;
    }
  }

  return {
    sessions,
    loading,
    error,
    clearError: () => setError(null),
    activeSession,
    setActiveSession,
    addItem,
    updateItem,
    deleteItem,
  };
}

export default useLessonSessions;
