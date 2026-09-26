"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeNotification = serializeNotification;
exports.notifyUser = notifyUser;
exports.notifyRoles = notifyRoles;
const prisma_1 = require("./prisma");
const socket_1 = require("../realtime/socket");
// خروجی رو دقیقاً هم‌شکل Notification تو client/src/api/notificationApi.ts
// نگه می‌داریم.
// isRead جدا از خودِ n پاس داده می‌شه: برای اعلانِ شخصی همون n.read ـه، ولی
// برای اعلانِ گروهی (targetRoles) n.read دیگه معتبر نیست - چون اون ردیف
// بینِ چند کاربر مشترکه و وضعیتِ خوندن باید جدا جدا (از NotificationRead)
// برای همین کاربر خاص محاسبه بشه؛ صدازننده (routes/notifications.ts)
// مسئولِ این حساب‌کتابه.
function serializeNotification(n, isRead) {
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
function pushLive(notification) {
    try {
        const io = (0, socket_1.getIo)();
        if (notification.userId) {
            io.to(`user:${notification.userId}`).emit('notification:new', notification);
        }
        else {
            for (const role of notification.targetRoles ?? []) {
                io.to(`role:${role}`).emit('notification:new', notification);
            }
        }
    }
    catch {
        // سوکت هنوز init نشده - نادیده می‌گیریم
    }
}
// اعلان مخصوص یه کاربر (معادل notifyStudentAddedToGroup / notifyInstructorOfAttempt تو mock)
async function notifyUser(userId, title, icon) {
    const notification = await prisma_1.prisma.notification.create({
        data: { userId, title, icon },
    });
    const serialized = serializeNotification(notification, false);
    pushLive(serialized);
    return serialized;
}
// اعلان عمومی برای همه‌ی کاربرهای یه نقش خاص (یا چند نقش)
async function notifyRoles(roles, title, icon) {
    const notification = await prisma_1.prisma.notification.create({
        data: { targetRoles: roles, title, icon },
    });
    const serialized = serializeNotification(notification, false);
    pushLive(serialized);
    return serialized;
}
