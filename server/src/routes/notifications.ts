import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { serializeNotification } from '../lib/notifications';
import { markAllReadSchema } from '../validation/notificationSchemas';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../lib/errors';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const notifications = await prisma.notification.findMany({
      where: {
        reads: { none: { userId: sub, dismissedAt: { not: null } } },
        OR: [{ userId: sub }, { userId: null, targetRoles: { has: role } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

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

// Dismiss for this recipient only, including shared role announcements.
router.delete('/:id', asyncHandler(async (req, res) => {
  const { sub, role } = req.user!;
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, OR: [{ userId: sub }, { userId: null, targetRoles: { has: role } }] },
    select: { id: true },
  });
  if (!notification) throw notFound('اعلان یافت نشد');
  await prisma.notificationRead.upsert({
    where: { userId_notificationId: { userId: sub, notificationId: notification.id } },
    create: { userId: sub, notificationId: notification.id, dismissedAt: new Date() },
    update: { dismissedAt: new Date() },
  });
  res.status(204).end();
}));

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

    // Broadcast read state is per recipient; never update a shared read flag.
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

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const parsed = markAllReadSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const { sub, role } = req.user!;

    // Restrict supplied IDs to notifications visible to the current user.
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
