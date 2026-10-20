import { readCreationPolicy } from '../../lib/approvalPolicy';
import { parseListQuery } from '../../lib/listPagination';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/requireAuth';
import { generateUniqueJoinCode } from '../../lib/joinCode';
import { asyncHandler } from '../../lib/asyncHandler';
import {
  createGroupSchema,
  updateGroupSchema,
} from '../../validation/groupSchemas';
import { withQuotaLock } from '../../lib/quota';
import { resolveStudentIds, serializeGroup, withStudents } from './groups.service';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const where =
      role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
        ? { instructorId: sub }
        : { approvalStatus: 'Approved' as const, students: { some: { id: sub } } };

    const { page, pageSize, skip, search } = parseListQuery(req.query);
    const filter = { ...where, ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}) };
    const [groups, total] = await prisma.$transaction([
      prisma.group.findMany({
        where: filter,
        include: withStudents,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.group.count({ where: filter }),
    ], { isolationLevel: 'RepeatableRead' });
    res.json({ items: groups.map(serializeGroup), total, page, pageSize });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: withStudents,
    });
    if (!group) return res.status(404).json({ error: 'گروه یافت نشد' });

    const { role, sub } = req.user!;
    const isOwner = role === 'Instructor' && group.instructorId === sub;
    const isMember =
      role === 'Student' && group.approvalStatus === 'Approved' && group.students.some((s) => s.id === sub);
    if (role !== 'SuperAdmin' && !isOwner && !isMember) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    res.json(serializeGroup(group));
  })
);

router.post(
  '/',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0].message });

    const studentConnect = await resolveStudentIds(
      parsed.data.studentIds,
      req.user!.role,
      req.user!.sub
    );

    const joinCode = await generateUniqueJoinCode();

    // Check quota and create the group in the same locked transaction.
    const group = await withQuotaLock(req.user!.sub, 'groups', 1, async (db) => {
      const policy = await readCreationPolicy(db);
      return db.group.create({
        data: {
          approvalStatus: policy.requireGroupApproval ? 'Pending' : 'Approved',
          name: parsed.data.name,
          category: parsed.data.category,
          instructorId: req.user!.sub,
          joinCode,
          students: { connect: studentConnect },
        },
        include: withStudents,
      });
    }, { requireTransaction: true });

    res.status(201).json(serializeGroup(group));
  })
);

router.put(
  '/:id',
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

    const parsed = updateGroupSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues[0].message });

    const studentSet = await resolveStudentIds(
      parsed.data.studentIds,
      req.user!.role,
      existing.instructorId
    );

    const group = await prisma.group.update({
      where: { id: req.params.id },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        students: { set: studentSet },
      },
      include: withStudents,
    });

    res.json(serializeGroup(group));
  })
);

router.delete(
  '/:id',
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

    await prisma.group.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
