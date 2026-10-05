import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { conflict } from './errors';

// Held until the creation transaction commits: policy updates cannot race creation.
export async function readCreationPolicy(db: Prisma.TransactionClient) {
  await db.$queryRaw`SELECT id FROM approval_policy WHERE id = 'global' FOR SHARE`;
  return db.approvalPolicy.findUniqueOrThrow({ where: { id: 'global' } });
}
export async function approvalPolicySnapshot() {
  return prisma.$transaction(
    async (db) => {
      const policy = await db.approvalPolicy.findUniqueOrThrow({
        where: { id: 'global' },
      });
      const pendingInstructors = await db.user.count({
        where: { role: 'Instructor', approvalStatus: 'Pending' },
      });
      const pendingGroups = await db.group.count({
        where: { approvalStatus: 'Pending' },
      });
      return { ...policy, pendingInstructors, pendingGroups };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
export function assertPolicyRevision(actual: number, expected: number) {
  if (actual !== expected)
    throw conflict(
      'تنظیمات توسط مدیر دیگری تغییر کرده است؛ صفحه را تازه کنید.',
    );
}
