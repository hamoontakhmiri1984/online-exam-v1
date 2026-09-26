"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const notifications_1 = require("../lib/notifications");
const notificationSchemas_1 = require("../validation/notificationSchemas");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// اعلان‌های قابل‌دیدن برای کاربر جاری: یا مستقیم مال خودشه (userId)، یا
// عمومیه و نقشش تو targetRoles هست - دقیقاً معادل getNotificationsForUser
// تو mock (client/src/api/notificationApi.ts)
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const notifications = await prisma_1.prisma.notification.findMany({
        where: {
            OR: [{ userId: sub }, { userId: null, targetRoles: { has: role } }],
        },
        orderBy: { createdAt: 'desc' },
        // بدون سقف، با گذشت زمان کل تاریخچه‌ی اعلان‌ها با هر بار باز شدنِ صفحه
        // (و حالا با هر بار بازکردنِ پنل) دریافت می‌شد
        take: 100,
    });
    // اعلان‌های گروهی این batch رو جدا کن و برای همینِ کاربر چک کن کدوم‌ها
    // رو قبلاً دیده (NotificationRead) - اعلانِ شخصی نیازی به این چک نداره
    const broadcastIds = notifications
        .filter((n) => n.userId === null)
        .map((n) => n.id);
    const readRows = broadcastIds.length
        ? await prisma_1.prisma.notificationRead.findMany({
            where: { userId: sub, notificationId: { in: broadcastIds } },
            select: { notificationId: true },
        })
        : [];
    const readBroadcastIds = new Set(readRows.map((r) => r.notificationId));
    res.json(notifications.map((n) => (0, notifications_1.serializeNotification)(n, n.userId === sub ? n.read : readBroadcastIds.has(n.id))));
}));
// یه اعلان رو خونده‌شده علامت می‌زنه - فقط اگه واقعاً برای این کاربر قابل‌دیدن باشه
router.post('/:id/read', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const existing = await prisma_1.prisma.notification.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        throw (0, errors_1.notFound)('اعلان یافت نشد');
    const visible = existing.userId === sub ||
        (existing.userId === null && existing.targetRoles.includes(role));
    if (!visible)
        throw (0, errors_1.forbidden)();
    if (existing.userId === sub) {
        const updated = await prisma_1.prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true },
        });
        return res.json((0, notifications_1.serializeNotification)(updated, true));
    }
    // اعلانِ گروهیه - ستونِ مشترکِ read رو دست نمی‌زنیم (وگرنه برای بقیه‌ی
    // کاربرهای همون نقش هم «خونده‌شده» می‌شد)، فقط برای همینِ کاربر یه ردیف
    // NotificationRead ثبت می‌کنیم. upsert چون ممکنه از قبل هم خونده باشتش
    // (دوبار کلیک/ریفرش) و باید idempotent بمونه.
    await prisma_1.prisma.notificationRead.upsert({
        where: {
            userId_notificationId: { userId: sub, notificationId: existing.id },
        },
        create: { userId: sub, notificationId: existing.id },
        update: {},
    });
    res.json((0, notifications_1.serializeNotification)(existing, true));
}));
// معادل markAllNotificationsRead تو mock - فقط از بین idهای ارسالی، همونایی
// که واقعاً برای این کاربر قابل‌دیدنن رو خونده‌شده می‌کنه (نه هر id دلخواهی)
router.post('/read-all', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = notificationSchemas_1.markAllReadSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const { sub, role } = req.user;
    // فقط idهایی که واقعاً برای همینِ کاربر قابل‌دیدنن رو در نظر بگیر (نه
    // هر id دلخواهی که تو بدنه‌ی درخواست اومده)
    const visible = await prisma_1.prisma.notification.findMany({
        where: {
            id: { in: parsed.data.ids },
            OR: [{ userId: sub }, { userId: null, targetRoles: { has: role } }],
        },
        select: { id: true, userId: true },
    });
    const personalIds = visible
        .filter((n) => n.userId === sub)
        .map((n) => n.id);
    const broadcastIds = visible
        .filter((n) => n.userId === null)
        .map((n) => n.id);
    // شخصی‌ها روی ستونِ خودشون، گروهی‌ها به‌عنوانِ ردیفِ جدا per-user - دقیقاً
    // همون منطقِ /:id/read، اینجا فقط batch شده
    await prisma_1.prisma.$transaction([
        ...(personalIds.length
            ? [
                prisma_1.prisma.notification.updateMany({
                    where: { id: { in: personalIds } },
                    data: { read: true },
                }),
            ]
            : []),
        ...(broadcastIds.length
            ? [
                prisma_1.prisma.notificationRead.createMany({
                    data: broadcastIds.map((notificationId) => ({
                        userId: sub,
                        notificationId,
                    })),
                    skipDuplicates: true,
                }),
            ]
            : []),
    ]);
    res.status(204).end();
}));
exports.default = router;
