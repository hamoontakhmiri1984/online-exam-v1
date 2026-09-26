"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceActiveOtp = replaceActiveOtp;
const client_1 = require("@prisma/client");
const prisma_1 = require("./prisma");
async function replaceActiveOtp(data, ttlMs) {
    // Transaction-scoped locking also works before the first OTP row exists.
    // JSON encoding keeps identifier/purpose pairs unambiguous.
    const key = JSON.stringify(['otp', data.identifier, data.purpose]);
    return prisma_1.prisma.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlMs);
        await tx.otpCode.updateMany({
            where: { identifier: data.identifier, purpose: data.purpose, consumedAt: null },
            data: { consumedAt: now },
        });
        await tx.otpCode.create({ data: { ...data, expiresAt } });
        return expiresAt;
    }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.ReadCommitted });
}
