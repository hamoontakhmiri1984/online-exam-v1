import { apiRequest } from '../lib/apiClient';
import type { Role } from './authApi';

export type NotificationIcon = 'info' | 'people' | 'award';

export type Notification = {
  id: string;
  // اگه userId ست بشه، فقط برای همون یه کاربر خاصه (مثلاً «به گروه X اضافه
  // شدی»). اگه نه، بر اساس targetRoles برای همه‌ی کاربرهای اون نقش‌هاست
  // (مثلاً یه اطلاع‌رسانی عمومی به همه‌ی دانشجوها)
  userId?: string;
  targetRoles?: Role[];
  title: string;
  createdAt: string; // ISO timestamp
  read: boolean;
  icon: NotificationIcon;
};

// شکل خروجی سرور (server/src/lib/notifications.ts -> serializeNotification)
// عمداً دقیقاً همین Notification ـه. ساخت اعلان‌ها (وقتی دانشجویی به گروهی
// اضافه می‌شه، وقتی نتیجه‌ی آزمونی ثبت می‌شه و ...) دیگه سمت سرور انجام
// می‌شه (notifyUser/notifyRoles تو server/src/lib/notifications.ts، صدا
// زده‌شده از groups.ts و examAttempts.ts) - برای همین generator هایی که تو
// نسخه‌ی mock اینجا بودن (notifyStudentAddedToGroup/notifyInstructorOfAttempt)
// حذف شدن؛ جایی هم صداشون نمی‌زد.
//
// پوش لحظه‌ای (سوکت 'notification:new') از قبل سمت سرور آماده‌ست ولی
// وصل‌کردنش سمت کلاینت فاز جداست (client/src/lib/socket.ts) - فعلاً فقط
// روی fetch/polling معمولی (همون رفتار قبلی هوک) کار می‌کنیم.

// GET /notifications خودش بر اساس کاربر لاگین‌شده (از accessToken) فیلتر
// می‌کنه - userId/role دیگه لازم نیست به سرور فرستاده بشن، ولی پارامترها
// رو نگه داشتیم تا امضای فراخوانی‌شده از useNotifications.ts عوض نشه.
export function getNotificationsForUser(
  _userId: string,
  _role: Role
): Promise<Notification[]> {
  return apiRequest<Notification[]>('/notifications');
}

export function markNotificationRead(id: string): void {
  apiRequest<Notification>(`/notifications/${id}/read`, {
    method: 'POST',
  }).catch(() => {
    // بهینه‌بینانه (optimistic) عمل می‌کنیم - UI همین الان تو useNotifications
    // خودش رو خونده‌شده نشون می‌ده؛ اگه درخواست واقعاً شکست بخوره (مثلاً قطعی
    // شبکه)، با رفرش بعدی صفحه وضعیت واقعی از سرور دوباره میاد
  });
}

// فقط اعلان‌هایی که آی‌دیشون داده شده رو خونده‌شده علامت می‌زنه - سرور خودش
// هم دوباره فیلتر می‌کنه که فقط اعلان‌های قابل‌دیدنِ همین کاربر واقعاً
// خونده‌شده بشن (نه هر id دلخواهی که کلاینت بفرسته)
export function markAllNotificationsRead(ids: string[]): void {
  if (ids.length === 0) return;

  apiRequest<void>('/notifications/read-all', {
    method: 'POST',
    body: { ids },
  }).catch(() => {
    // مثل markNotificationRead - optimistic؛ خطای شبکه با رفرش بعدی جبران می‌شه
  });
}
