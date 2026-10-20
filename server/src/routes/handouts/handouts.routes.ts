import { logEvent } from '../../lib/logger';
import { Router } from 'express';

import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../../lib/errors';
import { getSignedDownloadUrl } from '../../lib/storage';
import { deleteUnreferencedObjects } from '../../lib/objectCleanup';
import {
  createHandoutSchema,
  updateHandoutSchema,
} from '../../validation/handoutSchemas';
import { withQuotaLock } from '../../lib/quota';
import { canUseObjectKeys } from '../../lib/objectKeys';

import {
  serializeHandout,
  loadStudentGroupContext,
  studentVisibilityWhere,
  studentCanSeeHandout,
  loadOwnedHandout,
  notifyAudienceAboutHandout,
} from './handouts.service';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    if (role === 'Student') {
      const groups = await loadStudentGroupContext(sub);
      const handouts = await prisma.handout.findMany({
        where: studentVisibilityWhere(groups),
        orderBy: { createdAt: 'desc' },
      });
      return res.json(handouts.map(serializeHandout));
    }

    const where = role === 'SuperAdmin' ? {} : { instructorId: sub };
    const handouts = await prisma.handout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(handouts.map(serializeHandout));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const handout = await prisma.handout.findUnique({
      where: { id: req.params.id },
    });
    if (!handout) throw notFound('جزوه یافت نشد');

    if (role === 'Student') {
      const groups = await loadStudentGroupContext(sub);
      if (!studentCanSeeHandout(handout, groups)) throw forbidden();
      return res.json(serializeHandout(handout));
    }

    if (role !== 'SuperAdmin' && handout.instructorId !== sub) {
      throw forbidden();
    }
    res.json(serializeHandout(handout));
  })
);

router.post(
  '/',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const parsed = createHandoutSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const { sub } = req.user!;
    const { groupId } = parsed.data;

    if (!canUseObjectKeys('lesson-attachments', sub, [parsed.data.objectKey])) {
      throw forbidden('فایل انتخاب‌شده متعلق به تو نیست');
    }

    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) throw notFound('گروه یافت نشد');
      if (group.instructorId !== sub) throw forbidden();
    }

    const handout = await withQuotaLock(sub, 'handouts', 1, (db) =>
      db.handout.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          groupId: groupId ?? null,
          instructorId: sub,
          fileName: parsed.data.fileName,
          fileUrl: parsed.data.objectKey,
          fileSize: parsed.data.fileSize,
        },
      })
    );

    // Notification delivery must not roll back a successful handout creation.
    notifyAudienceAboutHandout(handout).catch((err) =>
      logEvent('error', 'notifyAudienceAboutHandout failed:', err)
    );

    res.status(201).json(serializeHandout(handout));
  })
);

router.put(
  '/:id',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { handout, allowed } = await loadOwnedHandout(
      req.params.id,
      sub,
      role
    );
    if (!handout) throw notFound('جزوه یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = updateHandoutSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const { groupId } = parsed.data;

    if (
      role === 'Instructor' &&
      parsed.data.objectKey &&
      !canUseObjectKeys(
        'lesson-attachments',
        sub,
        [parsed.data.objectKey],
        [handout.fileUrl]
      )
    ) {
      throw forbidden('فایل انتخاب‌شده متعلق به تو نیست');
    }

    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) throw notFound('گروه یافت نشد');
      if (role === 'Instructor' && group.instructorId !== sub) {
        throw forbidden();
      }
    }

    // Delete the old object only when the stored object key changes.
    const replacingFile =
      Boolean(parsed.data.objectKey) &&
      parsed.data.objectKey !== handout.fileUrl;

    const updated = await prisma.handout.update({
      where: { id: handout.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        groupId: groupId ?? null,
        ...(parsed.data.objectKey
          ? {
              fileName: parsed.data.fileName,
              fileUrl: parsed.data.objectKey,
              fileSize: parsed.data.fileSize,
            }
          : {}),
      },
    });

    // Delete storage objects only after all database references are gone.
    if (replacingFile) {
      await deleteUnreferencedObjects([handout.fileUrl]);
    }

    res.json(serializeHandout(updated));
  })
);

router.delete(
  '/:id',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { handout, allowed } = await loadOwnedHandout(
      req.params.id,
      sub,
      role
    );
    if (!handout) throw notFound('جزوه یافت نشد');
    if (!allowed) throw forbidden();

    await prisma.handout.delete({ where: { id: handout.id } });
    await deleteUnreferencedObjects([handout.fileUrl]);

    res.status(204).end();
  })
);

router.get(
  '/:id/signed-url',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const handout = await prisma.handout.findUnique({
      where: { id: req.params.id },
    });
    if (!handout) throw notFound('جزوه یافت نشد');

    if (role === 'Student') {
      const groups = await loadStudentGroupContext(sub);
      if (!studentCanSeeHandout(handout, groups)) throw forbidden();
    } else if (role !== 'SuperAdmin' && handout.instructorId !== sub) {
      throw forbidden();
    }

    const url = await getSignedDownloadUrl(handout.fileUrl);
    res.json({ url });
  })
);

export default router;
