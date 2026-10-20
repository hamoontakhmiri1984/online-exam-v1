import { logEvent } from '../../lib/logger';
import { Router } from 'express';

import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../lib/notifications';
import { revokeSession } from '../../lib/session';
import { forceLogoutOtherSessions } from '../../realtime/socket';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, badRequest } from '../../lib/errors';
import type { Prisma } from '@prisma/client';
import { recordAdminAction } from '../../lib/adminAudit';

import { serializeInstructor } from './instructors.service';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || 'Pending';
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      throw badRequest('status نامعتبره');
    }

    const instructors = await prisma.user.findMany({
      where: {
        role: 'Instructor',
        approvalStatus: status as Prisma.UserWhereInput['approvalStatus'],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(instructors.map(serializeInstructor));
  })
);

router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== 'Instructor') {
      throw notFound('مدرس پیدا نشد');
    }

    // Repeated approval must not emit duplicate notifications.
    if (user.approvalStatus === 'Approved') {
      res.json(serializeInstructor(user));
      return;
    }

    // Commit the status change and audit record together.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: user.id },
        data: { approvalStatus: 'Approved' },
      });
      await recordAdminAction(tx, {
        adminId: req.user!.sub,
        action: 'instructor.approve',
        targetType: 'User',
        targetId: user.id,
        before: { approvalStatus: user.approvalStatus },
        after: { approvalStatus: 'Approved' },
      });
      return result;
    });

    notifyUser(
      updated.id,
      'حساب مدرسی‌ت تایید شد - می‌تونی وارد بشی',
      'award'
    ).catch((err) => logEvent('error', 'notifyUser failed:', err));

    res.json(serializeInstructor(updated));
  })
);

router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== 'Instructor') {
      throw notFound('مدرس پیدا نشد');
    }

    // Retry session revocation even when the account is already rejected.
    const alreadyRejected = user.approvalStatus === 'Rejected';
    const updated = alreadyRejected
      ? user
      : await prisma.$transaction(async (tx) => {
          const result = await tx.user.update({
            where: { id: user.id },
            data: { approvalStatus: 'Rejected' },
          });
          await recordAdminAction(tx, {
            adminId: req.user!.sub,
            action: 'instructor.reject',
            targetType: 'User',
            targetId: user.id,
            before: { approvalStatus: user.approvalStatus },
            after: { approvalStatus: 'Rejected' },
          });
          return result;
        });

    await revokeSession(updated.id);
    forceLogoutOtherSessions(updated.id, undefined, 'account-rejected');

    if (!alreadyRejected) {
      notifyUser(updated.id, 'درخواست ثبت‌نام مدرسی‌ت رد شد', 'info').catch(
        (err) => logEvent('error', 'notifyUser failed:', err)
      );
    }

    res.json(serializeInstructor(updated));
  })
);

export default router;
