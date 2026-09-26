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

// دانشجو با کد عضویت، خودش رو به گروه اضافه می‌کنه - idempotent (اگه از
// قبل عضو بود، خطا نمی‌ده و همون گروه رو برمی‌گردونه)
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

    const alreadyMember = group.students.some((s) => s.id === req.user!.sub);
    if (!alreadyMember) {
      await prisma.group.update({
        where: { id: group.id },
        data: { students: { connect: { id: req.user!.sub } } },
      });
      // اعلان برای خودِ دانشجو - دقیقاً معادل notifyStudentAddedToGroup تو mock
      // (client/src/api/notificationApi.ts) که از addStudentToGroup صدا زده می‌شد
      await notifyUser(
        req.user!.sub,
        `به گروه «${group.name}» اضافه شدی`,
        'people'
      );
      // به‌علاوه: به مدرس هم خبر بده که یه دانشجوی جدید پیوست (چیزی که mock
      // نداشت ولی برای مدرس مفیده)
      await notifyUser(
        group.instructorId,
        `یه دانشجوی جدید به گروه «${group.name}» پیوست`,
        'people'
      );
    }

    const updated = await prisma.group.findUnique({
      where: { id: group.id },
      include: withStudents,
    });
    res.json(serializeGroup(updated!));
  })
);

// کد قدیمی رو باطل و یه کد جدید می‌سازه - فقط مالک گروه یا SuperAdmin
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