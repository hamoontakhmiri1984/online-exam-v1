"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestOtp = requestOtp;
exports.verifyOtpCode = verifyOtpCode;
const prisma_1 = require("../../../lib/prisma");
const otp_1 = require("../../../lib/otp");
const otpAbuseGuard_1 = require("../../../lib/otpAbuseGuard");
const otpSender_1 = require("../../../services/otpSender");
const authTokens_1 = require("../../../lib/authTokens");
const socket_1 = require("../../../realtime/socket");
const errors_1 = require("../../../lib/errors");
const auth_helpers_1 = require("../auth.helpers");
const OTP_ERROR_MESSAGES = {
    not_found: 'کدی برای این شناسه پیدا نشد. دوباره درخواست بده',
    expired: 'کد منقضی شده. دوباره درخواست بده',
    too_many_attempts: 'تعداد تلاش‌ها بیش از حد مجازه. کد جدید بگیر',
    invalid_code: 'کد وارد شده اشتباهه',
};
async function requestOtp(data, ip) {
    const resolved = (0, auth_helpers_1.resolveIdentifier)(data.identifier);
    if (!resolved) {
        throw (0, errors_1.badRequest)('ایمیل یا شماره موبایل نامعتبره');
    }
    const { value, channel, type } = resolved;
    // قبل از هر lookup/ارسالی؛ روی همه‌ی purpose ها یکسان اعمال می‌شه تا
    // پاسخ‌ش وجود/عدم وجود حساب رو لو نده
    await (0, otpAbuseGuard_1.assertOtpSendAllowed)({
        ip,
        identifier: value,
        captchaId: data.captchaId,
        captchaAnswer: data.captchaAnswer,
    });
    if (data.purpose !== 'REGISTER') {
        const where = type === 'EMAIL'
            ? {
                email: value,
            }
            : {
                phone: value,
            };
        const user = await prisma_1.prisma.user.findFirst({
            where,
        });
        // پاسخ باید برای حساب موجود/ناموجود از نظر محتوا و زمان یکسان باشه:
        // ارسال کد (ایمیل/پیامک) منتظر نمی‌مونه - وگرنه هم تاخیرش و هم خطای 502
        // ارسال، وجود حساب رو لو می‌داد. خطای ارسال فقط لاگ می‌شه.
        if (user) {
            const { code } = await (0, otp_1.createOtp)({
                identifier: value,
                channel,
                purpose: data.purpose,
                userId: user.id,
            });
            (0, otpSender_1.sendOtp)({ identifier: value, channel, code }).catch((error) => {
                console.error('sendOtp failed:', error);
            });
        }
        else {
            await (0, otp_1.simulateOtpCreationCost)();
        }
        return {
            message: 'اگر این حساب وجود داشته باشه، کد ارسال می‌شه',
        };
    }
    const { code } = await (0, otp_1.createOtp)({
        identifier: value,
        channel,
        purpose: data.purpose,
    });
    await deliverOtp(value, channel, code);
    return {
        message: 'کد تایید ارسال شد',
    };
}
async function verifyOtpCode(data) {
    const resolved = (0, auth_helpers_1.resolveIdentifier)(data.identifier);
    if (!resolved) {
        throw (0, errors_1.badRequest)('ایمیل یا شماره موبایل نامعتبره');
    }
    const { value, type } = resolved;
    const result = await (0, otp_1.verifyOtp)({
        identifier: value,
        purpose: data.purpose,
        code: data.code,
    });
    if (!result.ok) {
        throw (0, errors_1.badRequest)(OTP_ERROR_MESSAGES[result.reason] ?? 'کد تایید نامعتبره');
    }
    const where = type === 'EMAIL'
        ? {
            email: value,
        }
        : {
            phone: value,
        };
    let user = await prisma_1.prisma.user.findFirst({
        where,
    });
    if (!user) {
        throw (0, errors_1.notFound)('کاربر پیدا نشد');
    }
    // اگه حساب تا الان هیچ‌وقت تایید نشده، رمزش رو کسی موقع «ثبت‌نام ناتمام»
    // گذاشته (ممکنه شخص دیگه‌ای غیر از صاحب ایمیل/موبایل باشه). وقتی صاحب واقعی
    // از مسیر دیگه‌ای (ورود با کد یا ...) حساب رو تایید می‌کنه، اون رمز باید پاک
    // بشه تا کسی که ثبت‌نام رو شروع کرده نتونه با اون رمز وارد بشه.
    const wasNeverVerified = !user.emailVerifiedAt && !user.phoneVerifiedAt;
    if (type === 'EMAIL') {
        if (!user.emailVerifiedAt) {
            user = await prisma_1.prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    emailVerifiedAt: new Date(),
                },
            });
        }
    }
    else if (!user.phoneVerifiedAt) {
        user = await prisma_1.prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                phoneVerifiedAt: new Date(),
            },
        });
    }
    if (wasNeverVerified && data.purpose !== 'REGISTER' && user.passwordHash) {
        user = await prisma_1.prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                passwordHash: null,
            },
        });
    }
    if (data.purpose === 'RESET_PASSWORD') {
        return {
            type: 'reset',
            resetTicket: await (0, authTokens_1.signResetTicket)(user.id),
        };
    }
    const approvalMessage = (0, auth_helpers_1.instructorApprovalBlockMessage)(user);
    if (approvalMessage) {
        return {
            type: 'pending',
            message: approvalMessage,
        };
    }
    const rememberMe = data.purpose === 'REGISTER' ? true : Boolean(data.rememberMe);
    const { accessToken, refreshToken, sid } = await (0, authTokens_1.issueTokenPair)(user.id, user.role, rememberMe);
    (0, socket_1.forceLogoutOtherSessions)(user.id, sid);
    return {
        type: 'authenticated',
        accessToken,
        refreshToken,
        rememberMe,
        user: {
            id: user.id,
            name: user.name,
            role: user.role,
            username: user.username,
            onboardingCompleted: user.onboardingCompleted,
            organizationName: user.organizationName,
        },
    };
}
async function deliverOtp(identifier, channel, code) {
    try {
        await (0, otpSender_1.sendOtp)({
            identifier,
            channel,
            code,
        });
    }
    catch (error) {
        console.error('sendOtp failed:', error);
        throw new errors_1.AppError(502, 'ارسال کد تایید ناموفق بود، دوباره تلاش کن');
    }
}
