import { logEvent } from '../../lib/logger';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/requireAuth';
import { generateUniqueJoinCode } from '../../lib/joinCode';
import { notifyUser } from '../../lib/notifications';
import { asyncHandler } from '../../lib/asyncHandler';
import { joinGroupSchema } from '../../validation/groupSchemas';
import { joinGroupLimiter } from '../../middleware/rateLimiters';
import { serializeGroup, withStudents } from './groups.service';

const router = Router();

router.post(
  '/join',
  requireRole('Student'),
  joinGroupLimiter,
  asyncHandler(async (req, res) => {
    const parsed = joinGroupSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0].message });

    const normalizedCode = parsed.data.joinCode.trim().toUpperCase();
    const group = await prisma.group.findUnique({
      where: { joinCode: normalizedCode },
      include: withStudents,
    });
    if (!group) return res.status(404).json({ error: 'کد عضویت نامعتبره' });

    if (group.approvalStatus !== 'Approved') return res.status(403).json({ error: 'این گروه هنوز تأیید نشده است.' });

    const alreadyMember = group.students.some((s) => s.id === req.user!.sub);
    if (!alreadyMember) {
      await prisma.group.update({
        where: { id: group.id },
        data: { students: { connect: { id: req.user!.sub } } },
      });
      // Membership is already committed; notification failures must not report the join as failed.
      const notifyAll = [
        notifyUser(
          req.user!.sub,
          `به گروه «${group.name}» اضافه شدی`,
          'people'
        ),
        notifyUser(
          group.instructorId,
          `یه دانشجوی جدید به گروه «${group.name}» پیوست`,
          'people'
        ),
      ];
      const results = await Promise.allSettled(notifyAll);
      for (const r of results) {
        if (r.status === 'rejected') {
          logEvent('error', 'join group notification failed:', r.reason);
        }
      }
    }

    const updated = await prisma.group.findUnique({
      where: { id: group.id },
      include: withStudents,
    });
    res.json(serializeGroup(updated!));
  })
);

router.post(
  '/:id/regenerate-join-code',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.group.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'گروه یافت نشد' });
    if (
      req.user!.role === 'Instructor' &&
      existing.instructorId !== req.user!.sub
    ) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const joinCode = await generateUniqueJoinCode();
    const group = await prisma.group.update({
      where: { id: req.params.id },
      data: { joinCode },
      include: withStudents,
    });

    res.json(serializeGroup(group));
  })
);

export default router;
