import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest } from '../../lib/errors';
import {
  approvalPolicySnapshot,
  assertPolicyRevision,
} from '../../lib/approvalPolicy';
import { recordAdminAction } from '../../lib/adminAudit';

const router = Router();
const schema = z
  .object({
    revision: z.number().int().nonnegative(),
    requireInstructorApproval: z.boolean(),
    requireGroupApproval: z.boolean(),
    pendingInstructors: z.enum(['keep', 'approve']).optional(),
    pendingGroups: z.enum(['keep', 'approve']).optional(),
  })
  .strict();
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await approvalPolicySnapshot());
  }),
);
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('تنظیمات تأیید نامعتبر است.');
    const input = parsed.data;
    const result = await prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM approval_policy WHERE id = 'global' FOR UPDATE`;
      const before = await db.approvalPolicy.findUniqueOrThrow({
        where: { id: 'global' },
      });
      assertPolicyRevision(before.revision, input.revision);
      const instructorCount = await db.user.count({
        where: { role: 'Instructor', approvalStatus: 'Pending' },
      });
      const groupCount = await db.group.count({
        where: { approvalStatus: 'Pending' },
      });
      if (
        before.requireInstructorApproval &&
        !input.requireInstructorApproval &&
        instructorCount &&
        !input.pendingInstructors
      )
        throw badRequest('تکلیف مدرس‌های منتظر تأیید را انتخاب کنید.');
      if (
        before.requireGroupApproval &&
        !input.requireGroupApproval &&
        groupCount &&
        !input.pendingGroups
      )
        throw badRequest('تکلیف گروه‌های منتظر تأیید را انتخاب کنید.');
      if (
        (input.requireInstructorApproval &&
          input.pendingInstructors === 'approve') ||
        (input.requireGroupApproval && input.pendingGroups === 'approve')
      )
        throw badRequest('تأیید جمعی فقط در حالت آزاد مجاز است.');
      const approvedInstructors =
        !input.requireInstructorApproval &&
        input.pendingInstructors === 'approve'
          ? (
              await db.user.updateMany({
                where: { role: 'Instructor', approvalStatus: 'Pending' },
                data: { approvalStatus: 'Approved' },
              })
            ).count
          : 0;
      const approvedGroups =
        !input.requireGroupApproval && input.pendingGroups === 'approve'
          ? (
              await db.group.updateMany({
                where: { approvalStatus: 'Pending' },
                data: { approvalStatus: 'Approved' },
              })
            ).count
          : 0;
      const policy = await db.approvalPolicy.update({
        where: { id: 'global' },
        data: {
          requireInstructorApproval: input.requireInstructorApproval,
          requireGroupApproval: input.requireGroupApproval,
          revision: { increment: 1 },
        },
      });
      await recordAdminAction(db, {
        adminId: req.user!.sub,
        action: 'approval_policy.update',
        targetType: 'ApprovalPolicy',
        targetId: 'global',
        before: {
          requireInstructorApproval: before.requireInstructorApproval,
          requireGroupApproval: before.requireGroupApproval,
          revision: before.revision,
        },
        after: {
          requireInstructorApproval: policy.requireInstructorApproval,
          requireGroupApproval: policy.requireGroupApproval,
          revision: policy.revision,
          pendingInstructors: input.pendingInstructors ?? 'keep',
          pendingGroups: input.pendingGroups ?? 'keep',
          approvedInstructors,
          approvedGroups,
        },
      });
      return {
        ...policy,
        pendingInstructors: instructorCount - approvedInstructors,
        pendingGroups: groupCount - approvedGroups,
      };
    });
    res.json(result);
  }),
);
export default router;
