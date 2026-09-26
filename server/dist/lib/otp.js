"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOtp = createOtp;
exports.verifyOtp = verifyOtp;
exports.simulateOtpCreationCost = simulateOtpCreationCost;
// server/src/lib/otp.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("./prisma");
const otpStore_1 = require("./otpStore");
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 2;
const MAX_VERIFY_ATTEMPTS = 5;
const SALT_ROUNDS = 10;
function generateNumericCode(length) {
    let code = '';
    for (let i = 0; i < length; i += 1) {
        code += (0, node_crypto_1.randomInt)(0, 10).toString();
    }
    return code;
}
async function createOtp({ identifier, channel, purpose, userId, }) {
    const code = generateNumericCode(OTP_LENGTH);
    const codeHash = await bcrypt_1.default.hash(code, SALT_ROUNDS);
    const expiresAt = await (0, otpStore_1.replaceActiveOtp)({
        identifier, channel, purpose, codeHash, userId,
    }, OTP_TTL_MINUTES * 60 * 1000);
    return {
        code,
        expiresAt,
    };
}
async function verifyOtp({ identifier, purpose, code, }) {
    const record = await prisma_1.prisma.otpCode.findFirst({
        where: {
            identifier,
            purpose,
            consumedAt: null,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    if (!record) {
        return {
            ok: false,
            reason: 'not_found',
        };
    }
    if (record.expiresAt <= new Date()) {
        return {
            ok: false,
            reason: 'expired',
        };
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        return {
            ok: false,
            reason: 'too_many_attempts',
        };
    }
    // Reserve a bounded attempt before the expensive hash comparison.
    const reserved = await prisma_1.prisma.otpCode.updateMany({
        where: {
            id: record.id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
            attempts: { lt: MAX_VERIFY_ATTEMPTS },
        },
        data: {
            attempts: {
                increment: 1,
            },
        },
    });
    if (reserved.count === 0) {
        return {
            ok: false,
            reason: 'too_many_attempts',
        };
    }
    const matches = await bcrypt_1.default.compare(code, record.codeHash);
    if (!matches) {
        return {
            ok: false,
            reason: 'invalid_code',
        };
    }
    // Only one verifier can consume an unexpired, still-active challenge.
    const consumed = await prisma_1.prisma.otpCode.updateMany({
        where: {
            id: record.id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
        },
        data: {
            consumedAt: new Date(),
        },
    });
    if (consumed.count === 0) {
        return {
            ok: false,
            reason: 'not_found',
        };
    }
    return {
        ok: true,
        userId: record.userId,
    };
}
// برای مسیرهایی که نباید وجود/عدم وجود حساب رو از روی زمان پاسخ لو بدن:
// وقتی حسابی نیست، هزینه‌ی ساخت کد (hash) رو بی‌اثر خرج می‌کنه تا زمان پاسخ
// با حالت «حساب هست» هم‌اندازه بمونه
async function simulateOtpCreationCost() {
    await bcrypt_1.default.hash(generateNumericCode(OTP_LENGTH), SALT_ROUNDS);
}
