import { Prisma } from '@prisma/client';
import type { OtpChannel, OtpPurpose } from '@prisma/client';
import { prisma } from './prisma';

interface NewOtp {
  identifier: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  codeHash: string;
  userId?: string;
}

export async function replaceActiveOtp(data: NewOtp, ttlMs: number): Promise<Date> {
  // Transaction-scoped locking also works before the first OTP row exists.
  // JSON encoding keeps identifier/purpose pairs unambiguous.
  const key = JSON.stringify(['otp', data.identifier, data.purpose]);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);
    await tx.otpCode.updateMany({
      where: { identifier: data.identifier, purpose: data.purpose, consumedAt: null },
      data: { consumedAt: now },
    });
    await tx.otpCode.create({ data: { ...data, expiresAt } });
    return expiresAt;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
