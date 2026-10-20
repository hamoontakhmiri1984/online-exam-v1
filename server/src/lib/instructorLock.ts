import type { Prisma } from '@prisma/client';
import { notFound } from './errors';

type Tx = Prisma.TransactionClient;

// Serialize subscription/quota mutations on the instructor row; lock it before the exam.
export async function lockInstructorForUpdate(
  tx: Tx,
  instructorId: string
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "users" WHERE "id" = ${instructorId} FOR NO KEY UPDATE
  `;
  if (rows.length === 0) throw notFound('مدرس یافت نشد');
}
