import { Router } from 'express';

import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import {
  createSessionSchema,
  updateSessionSchema,
} from '../../validation/lessonSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../../lib/errors';
import { getSignedDownloadUrl } from '../../lib/storage';
import { deleteUnreferencedObjects } from '../../lib/objectCleanup';

import {
  serializeSession,
  withGroups,
  sessionOrder,
  videoToDbFields,
  assertFileKeysAllowed,
  assertGroupsExist,
  ownedGroupIds,
  loadAccessibleSession,
} from './lessonSessions.service';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const groupId =
      typeof req.query.groupId === 'string' ? req.query.groupId : undefined;

    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) throw notFound('گروه یافت نشد');

      const isOwner = role === 'Instructor' && group.instructorId === sub;
      const isMember =
        role === 'Student' &&
        (await prisma.group.count({
          where: { id: groupId, approvalStatus: 'Approved' as const, students: { some: { id: sub } } },
        })) > 0;
      if (role !== 'SuperAdmin' && !isOwner && !isMember) {
        throw forbidden();
      }

      const sessions = await prisma.lessonSession.findMany({
        where: { groups: { some: { id: groupId } } },
        include: withGroups,
        orderBy: sessionOrder,
      });
      return res.json(sessions.map(serializeSession));
    }

    const where =
      role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
        ? { groups: { some: { instructorId: sub } } }
        : { groups: { some: { approvalStatus: 'Approved' as const, students: { some: { id: sub } } } } };

    const sessions = await prisma.lessonSession.findMany({
      where,
      include: withGroups,
      orderBy: sessionOrder,
    });
    res.json(sessions.map(serializeSession));
  })
);

// Instructor lessons require owned groups; only SuperAdmin may create ungrouped lessons.
router.post(
  '/',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    if (req.user!.role === 'Instructor') {
      if (parsed.data.groupIds.length === 0) {
        throw badRequest('حداقل باید یه گروه انتخاب کنی');
      }
      const owned = await ownedGroupIds(req.user!.sub);
      if (parsed.data.groupIds.some((id) => !owned.has(id))) {
        throw forbidden('فقط می‌تونی جلسه رو به گروه‌های خودت وصل کنی');
      }
    }

    if (req.user!.role === 'SuperAdmin') {
      await assertGroupsExist(parsed.data.groupIds);
    }
    assertFileKeysAllowed(req.user!, parsed.data);

    const session = await prisma.lessonSession.create({
      data: {
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        ...videoToDbFields(parsed.data.video),
        groups: { connect: parsed.data.groupIds.map((id) => ({ id })) },
        attachments: {
          create: parsed.data.attachments.map((a) => ({
            fileName: a.fileName,
            fileUrl: a.objectKey,
            fileSize: a.fileSize,
          })),
        },
      },
      include: withGroups,
    });

    res.status(201).json(serializeSession(session));
  })
);

router.put(
  '/:id',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.lessonSession.findUnique({
      where: { id: req.params.id },
      include: withGroups,
    });
    if (!existing) throw notFound('جلسه یافت نشد');

    if (req.user!.role === 'Instructor') {
      const owned = await ownedGroupIds(req.user!.sub);
      const belongsToInstructor = existing.groups.some((g) => owned.has(g.id));
      if (!belongsToInstructor) throw forbidden();
    }

    const parsed = updateSessionSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    if (req.user!.role === 'Instructor') {
      if (parsed.data.groupIds.length === 0) {
        throw badRequest('حداقل باید یه گروه انتخاب کنی');
      }
      const owned = await ownedGroupIds(req.user!.sub);
      if (parsed.data.groupIds.some((id) => !owned.has(id))) {
        throw forbidden('فقط می‌تونی جلسه رو به گروه‌های خودت وصل کنی');
      }
    }

    if (req.user!.role === 'SuperAdmin') {
      await assertGroupsExist(parsed.data.groupIds);
    }
    assertFileKeysAllowed(req.user!, parsed.data, existing);

    const session = await prisma.lessonSession.update({
      where: { id: req.params.id },
      data: {
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        ...videoToDbFields(parsed.data.video),
        groups: { set: parsed.data.groupIds.map((id) => ({ id })) },
        // Replace the complete attachment list; incoming attachments have no stable persisted IDs.
        attachments: {
          deleteMany: {},
          create: parsed.data.attachments.map((a) => ({
            fileName: a.fileName,
            fileUrl: a.objectKey,
            fileSize: a.fileSize,
          })),
        },
      },
      include: withGroups,
    });

    await deleteUnreferencedObjects([
      existing.videoObjectUrl,
      ...existing.attachments.map((a) => a.fileUrl),
    ]);

    res.json(serializeSession(session));
  })
);

// Authorize access before issuing a fresh signed URL for private uploads.
router.get(
  '/:id/video/signed-url',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { session, allowed } = await loadAccessibleSession(
      req.params.id,
      sub,
      role
    );
    if (!session) throw notFound('جلسه یافت نشد');
    if (!allowed) throw forbidden();

    if (session.videoType !== 'UPLOAD' || !session.videoObjectUrl) {
      throw badRequest('این جلسه ویدیوی آپلودی نداره');
    }

    const url = await getSignedDownloadUrl(session.videoObjectUrl);
    res.json({ url });
  })
);

// Authorize attachment downloads through their parent lesson.
router.get(
  '/attachments/:attachmentId/signed-url',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: req.params.attachmentId },
    });
    if (!attachment) throw notFound('فایل یافت نشد');

    const { session, allowed } = await loadAccessibleSession(
      attachment.sessionId,
      sub,
      role
    );
    if (!session) throw notFound('جلسه یافت نشد');
    if (!allowed) throw forbidden();

    const url = await getSignedDownloadUrl(attachment.fileUrl);
    res.json({ url });
  })
);

router.delete(
  '/:id',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.lessonSession.findUnique({
      where: { id: req.params.id },
      include: withGroups,
    });
    if (!existing) throw notFound('جلسه یافت نشد');

    if (req.user!.role === 'Instructor') {
      const owned = await ownedGroupIds(req.user!.sub);
      const belongsToInstructor = existing.groups.some((g) => owned.has(g.id));
      if (!belongsToInstructor) throw forbidden();
    }

    await prisma.lessonSession.delete({ where: { id: req.params.id } });

    await deleteUnreferencedObjects([
      existing.videoObjectUrl,
      ...existing.attachments.map((a) => a.fileUrl),
    ]);

    res.status(204).end();
  })
);

export default router;
