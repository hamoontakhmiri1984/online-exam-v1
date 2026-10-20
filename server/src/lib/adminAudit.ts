import { Prisma } from '@prisma/client';

export type AdminAuditAction =
  | 'instructor.approve'
  | 'instructor.reject'
  | 'instructor.plan_change'
  | 'approval_policy.update'
  | 'group.approve'
  | 'group.reject';

export type AdminAuditEntry = {
  adminId: string;
  action: AdminAuditAction;
  targetType: 'User' | 'Group' | 'ApprovalPolicy';
  targetId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

// Use the mutation transaction so the change and audit record commit together.
export async function recordAdminAction(
  db: Prisma.TransactionClient,
  entry: AdminAuditEntry
): Promise<void> {
  await db.adminAuditLog.create({
    data: {
      adminId: entry.adminId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      before: entry.before,
      after: entry.after,
    },
  });
}
