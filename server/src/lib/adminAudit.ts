import { Prisma } from '@prisma/client';

export type AdminAuditAction =
  | 'instructor.approve'
  | 'instructor.reject'
  | 'instructor.plan_change';

export type AdminAuditEntry = {
  adminId: string;
  action: AdminAuditAction;
  targetType: 'User';
  targetId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

// همیشه با tx همان تراکنشی صدا زده می‌شود که خود تغییر را انجام می‌دهد؛
// یعنی یا تغییر و تاریخچه‌اش هر دو ثبت می‌شوند یا هیچ‌کدام
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