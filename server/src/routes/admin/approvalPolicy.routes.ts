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
import { invalidateUserAuthCache } from '../../lib/userAuthCache';

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

      // Capture the exact users in this bulk operation so their authorization
      // cache can be invalidated after the transaction commits.
      const instructorsToApprove =
        !input.requireInstructorApproval &&
        input.pendingInstructors === 'approve'
          ? await db.user.findMany({
              where: { role: 'Instructor', approvalStatus: 'Pending' },
              select: { id: true },
            })
          : [];
      const approvedInstructors = instructorsToApprove.length
        ? (
            await db.user.updateMany({
              where: {
                id: { in: instructorsToApprove.map((user) => user.id) },
                role: 'Instructor',
                approvalStatus: 'Pending',
              },
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
        response: {
          ...policy,
          pendingInstructors: instructorCount - approvedInstructors,
          pendingGroups: groupCount - approvedGroups,
        },
        instructorIdsToInvalidate: instructorsToApprove.map((user) => user.id),
      };
    });

    // Invalidate only after commit; invalidating inside the transaction could
    // allow a stale database read to repopulate the new cache generation.
    await Promise.all(
      result.instructorIdsToInvalidate.map((userId) =>
        invalidateUserAuthCache(userId),
      ),
    );
    res.json(result.response);
  }),
);
export default router;
