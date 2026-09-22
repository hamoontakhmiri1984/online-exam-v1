import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { serializeNotification } from '../lib/notifications';
import { markAllReadSchema } from '../validation/notificationSchemas';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../lib/errors';

const router = Router();
router.use(requireAuth);

// اعلان‌های قابل‌دیدن برای کاربر جاری: یا مستقیم مال خودشه (userId)، یا
// عمومیه و نقشش تو targetRoles هست - دقیقاً معادل getNotificationsForUser
// تو mock (client/src/api/notificationApi.ts)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const notifications = await prisma.notification.findMany({
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
      ? await prisma.notificationRead.findMany({
          where: { userId: sub, notificationId: { in: broadcastIds } },
          select: { notificationId: true },
        })
      : [];
    const readBroadcastIds = new Set(readRows.map((r) => r.notificationId));

    res.json(
      notifications.map((n) =>
        serializeNotification(
          n,
          n.userId === sub ? n.read : readBroadcastIds.has(n.id)
        )
      )
    );
  })
);

// یه اعلان رو خونده‌شده علامت می‌زنه - فقط اگه واقعاً برای این کاربر قابل‌دیدن باشه
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const existing = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound('اعلان یافت نشد');

    const visible =
      existing.userId === sub ||
      (existing.userId === null && existing.targetRoles.includes(role));
    if (!visible) throw forbidden();

    if (existing.userId === sub) {
      const updated = await prisma.notification.update({
        where: { id: req.params.id },
        data: { read: true },
      });
      return res.json(serializeNotification(updated, true));
    }

    // اعلانِ گروهیه - ستونِ مشترکِ read رو دست نمی‌زنیم (وگرنه برای بقیه‌ی
    // کاربرهای همون نقش هم «خونده‌شده» می‌شد)، فقط برای همینِ کاربر یه ردیف
    // NotificationRead ثبت می‌کنیم. upsert چون ممکنه از قبل هم خونده باشتش
    // (دوبار کلیک/ریفرش) و باید idempotent بمونه.
    await prisma.notificationRead.upsert({
      where: {
        userId_notificationId: { userId: sub, notificationId: existing.id },
      },
      create: { userId: sub, notificationId: existing.id },
      update: {},
    });
    res.json(serializeNotification(existing, true));
  })
);

// معادل markAllNotificationsRead تو mock - فقط از بین idهای ارسالی، همونایی
// که واقعاً برای این کاربر قابل‌دیدنن رو خونده‌شده می‌کنه (نه هر id دلخواهی)
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const parsed = markAllReadSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const { sub, role } = req.user!;

    // فقط idهایی که واقعاً برای همینِ کاربر قابل‌دیدنن رو در نظر بگیر (نه
    // هر id دلخواهی که تو بدنه‌ی درخواست اومده)
    const visible = await prisma.notification.findMany({
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
    await prisma.$transaction([
      ...(personalIds.length
        ? [
            prisma.notification.updateMany({
              where: { id: { in: personalIds } },
              data: { read: true },
            }),
          ]
        : []),
      ...(broadcastIds.length
        ? [
            prisma.notificationRead.createMany({
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
  })
);

export default router;
