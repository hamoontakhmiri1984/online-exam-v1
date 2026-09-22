import { prisma } from './prisma';
import { getIo } from '../realtime/socket';
import type { Role } from './jwt';

export type NotificationIcon = 'info' | 'people' | 'award';

// خروجی رو دقیقاً هم‌شکل Notification تو client/src/api/notificationApi.ts
// نگه می‌داریم.
// isRead جدا از خودِ n پاس داده می‌شه: برای اعلانِ شخصی همون n.read ـه، ولی
// برای اعلانِ گروهی (targetRoles) n.read دیگه معتبر نیست - چون اون ردیف
// بینِ چند کاربر مشترکه و وضعیتِ خوندن باید جدا جدا (از NotificationRead)
// برای همین کاربر خاص محاسبه بشه؛ صدازننده (routes/notifications.ts)
// مسئولِ این حساب‌کتابه.
export function serializeNotification(
  n: {
    id: string;
    userId: string | null;
    targetRoles: Role[];
    title: string;
    icon: NotificationIcon;
    createdAt: Date;
  },
  isRead: boolean
) {
  return {
    id: n.id,
    userId: n.userId ?? undefined,
    targetRoles: n.targetRoles.length > 0 ? n.targetRoles : undefined,
    title: n.title,
    createdAt: n.createdAt.toISOString(),
    read: isRead,
    icon: n.icon,
  };
}

// پوش لحظه‌ای رو صرفاً best-effort انجام می‌دیم - اگه سوکت هنوز بالا نیومده
// (مثلاً تو یه اسکریپت/تست که initSocket صدا زده نشده)، فقط ردیف دیتابیس
// ساخته می‌شه و بعدی که کاربر رفرش/GET بزنه می‌بینتش
function pushLive(notification: ReturnType<typeof serializeNotification>) {
  try {
    const io = getIo();
    if (notification.userId) {
      io.to(`user:${notification.userId}`).emit(
        'notification:new',
        notification
      );
    } else {
      for (const role of notification.targetRoles ?? []) {
        io.to(`role:${role}`).emit('notification:new', notification);
      }
    }
  } catch {
    // سوکت هنوز init نشده - نادیده می‌گیریم
  }
}

// اعلان مخصوص یه کاربر (معادل notifyStudentAddedToGroup / notifyInstructorOfAttempt تو mock)
export async function notifyUser(
  userId: string,
  title: string,
  icon: NotificationIcon
) {
  const notification = await prisma.notification.create({
    data: { userId, title, icon },
  });
  const serialized = serializeNotification(notification, false);
  pushLive(serialized);
  return serialized;
}

// اعلان عمومی برای همه‌ی کاربرهای یه نقش خاص (یا چند نقش)
export async function notifyRoles(
  roles: Role[],
  title: string,
  icon: NotificationIcon
) {
  const notification = await prisma.notification.create({
    data: { targetRoles: roles, title, icon },
  });
  const serialized = serializeNotification(notification, false);
  pushLive(serialized);
  return serialized;
}
