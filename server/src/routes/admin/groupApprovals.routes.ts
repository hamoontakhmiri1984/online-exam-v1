import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { parseListQuery } from '../../lib/listPagination';
import { recordAdminAction } from '../../lib/adminAudit';

const router = Router();
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, search } = parseListQuery(req.query);
    const parsed = z
      .enum(['Pending', 'Approved', 'Rejected'])
      .safeParse(req.query.status ?? 'Pending');
    if (!parsed.success) throw badRequest('وضعیت نامعتبر است.');
    const where = {
      approvalStatus: parsed.data,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };
    const [items, total] = await prisma.$transaction(
      [
        prisma.group.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            name: true,
            category: true,
            approvalStatus: true,
            createdAt: true,
            instructor: { select: { name: true, username: true } },
          },
        }),
        prisma.group.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    res.json({ items, total, page, pageSize });
  }),
);
router.post(
  '/:id/decision',
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        status: z.enum(['Approved', 'Rejected']),
        expectedStatus: z.enum(['Pending', 'Rejected']),
      })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) throw badRequest('تصمیم نامعتبر است.');
    const result = await prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM groups WHERE id = ${req.params.id} FOR UPDATE`;
      const group = await db.group.findUnique({ where: { id: req.params.id } });
      if (!group) throw notFound('گروه یافت نشد.');
      if (group.approvalStatus === parsed.data.status) return group;
      if (group.approvalStatus !== parsed.data.expectedStatus)
        throw conflict('وضعیت گروه تغییر کرده است؛ فهرست را تازه کنید.');
      // This queue approves/rejects new groups; it never suspends an active class.
      const updated = await db.group.update({
        where: { id: group.id },
        data: { approvalStatus: parsed.data.status },
      });
      await recordAdminAction(db, {
        adminId: req.user!.sub,
        action:
          parsed.data.status === 'Approved' ? 'group.approve' : 'group.reject',
        targetType: 'Group',
        targetId: group.id,
        before: { approvalStatus: group.approvalStatus },
        after: { approvalStatus: updated.approvalStatus },
      });
      return updated;
    });
    res.json({ id: result.id, approvalStatus: result.approvalStatus });
  }),
);
export default router;
