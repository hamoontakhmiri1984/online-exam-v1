"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginWithPassword = loginWithPassword;
exports.resetPassword = resetPassword;
const prisma_1 = require("../../../lib/prisma");
const username_1 = require("../../../lib/username");
const password_1 = require("../../../lib/password");
const captcha_1 = require("../../../lib/captcha");
const authTokens_1 = require("../../../lib/authTokens");
const session_1 = require("../../../lib/session");
const loginSecurity_1 = require("../../../lib/loginSecurity");
const notifications_1 = require("../../../lib/notifications");
const socket_1 = require("../../../realtime/socket");
const errors_1 = require("../../../lib/errors");
const auth_helpers_1 = require("../auth.helpers");
async function invalidCredentials(ip) {
    await (0, loginSecurity_1.registerIpFailure)(ip);
    const captchaRequired = await (0, loginSecurity_1.isCaptchaRequired)(ip);
    return new errors_1.AppError(401, 'شناسه یا رمز اشتباهه', captchaRequired ? { captchaRequired: true } : undefined);
}
async function loginWithPassword(data, ip) {
    const captchaNeeded = await (0, loginSecurity_1.isCaptchaRequired)(ip);
    if (captchaNeeded) {
        if (!data.captchaId || !data.captchaAnswer) {
            throw new errors_1.AppError(400, 'برای ادامه لازمه کد تصویر امنیتی رو هم وارد کنی', {
                captchaRequired: true,
            });
        }
        const captchaValid = await (0, captcha_1.verifyCaptcha)(data.captchaId, data.captchaAnswer);
        if (!captchaValid) {
            await (0, loginSecurity_1.registerIpFailure)(ip);
            throw new errors_1.AppError(400, 'کد تصویر امنیتی اشتباهه یا منقضی شده', {
                captchaRequired: true,
            });
        }
    }
    const resolved = (0, auth_helpers_1.resolveIdentifier)(data.identifier);
    const user = resolved
        ? await prisma_1.prisma.user.findFirst({
            where: resolved.type === 'EMAIL'
                ? {
                    email: resolved.value,
                }
                : {
                    phone: resolved.value,
                },
        })
        : await prisma_1.prisma.user.findFirst({
            where: {
                usernameNormalized: (0, username_1.normalizeUsername)(data.identifier),
            },
        });
    if (!user || !user.passwordHash) {
        await (0, password_1.verifyAgainstDummy)(data.password);
        throw await invalidCredentials(ip);
    }
    if (await (0, loginSecurity_1.isAccountLocked)(user.id)) {
        throw new errors_1.AppError(423, 'به‌خاطر تلاش‌های ناموفق زیاد، ورود با رمز برای این حساب موقتاً قفل شده. با کد یکبارمصرف وارد شو یا چند دقیقه‌ی دیگه دوباره امتحان کن.');
    }
    const passwordValid = await (0, password_1.verifyPassword)(data.password, user.passwordHash);
    if (!passwordValid) {
        await (0, loginSecurity_1.registerFailedAttempt)(user.id);
        (0, notifications_1.notifyUser)(user.id, 'یک نفر برای حساب شما رمز عبور اشتباه وارد کرد', 'info').catch((error) => {
            console.error('notifyUser failed:', error);
        });
        throw await invalidCredentials(ip);
    }
    await (0, loginSecurity_1.clearFailedAttempts)(user.id);
    await (0, loginSecurity_1.clearIpFailures)(ip);
    const identifierVerified = user.email
        ? Boolean(user.emailVerifiedAt)
        : Boolean(user.phoneVerifiedAt);
    if (!identifierVerified) {
        throw new errors_1.AppError(403, user.email
            ? 'ایمیلت هنوز تایید نشده. اول با کد تایید (OTP) وارد شو'
            : 'موبایلت هنوز تایید نشده. اول با کد تایید (OTP) وارد شو');
    }
    const approvalMessage = (0, auth_helpers_1.instructorApprovalBlockMessage)(user);
    if (approvalMessage) {
        throw new errors_1.AppError(403, approvalMessage);
    }
    const { accessToken, refreshToken, sid } = await (0, authTokens_1.issueTokenPair)(user.id, user.role, data.rememberMe);
    (0, socket_1.forceLogoutOtherSessions)(user.id, sid);
    return {
        accessToken,
        refreshToken,
        rememberMe: data.rememberMe,
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
async function resetPassword(resetTicket, newPassword) {
    let userId;
    // فقط خودِ تیکت نامعتبر/منقضی/مصرف‌شده «لینک نامعتبر» حساب می‌شه؛ خطای
    // بعدی (دیتابیس و ...) دیگه به‌اشتباه با همین پیام پنهان نمی‌شه
    try {
        ({ sub: userId } = await (0, authTokens_1.verifyResetTicket)(resetTicket));
    }
    catch {
        throw (0, errors_1.badRequest)('لینک/کد نامعتبر یا منقضی‌شده');
    }
    const passwordHash = await (0, password_1.hashPassword)(newPassword);
    await prisma_1.prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            passwordHash,
        },
    });
    // کاربری که رمزش رو فراموش کرده ممکنه قفلِ ناشی از تلاش‌های ناموفق باشه؛
    // بعد از ریست نباید تا پایان قفل بلاک بمونه
    await (0, loginSecurity_1.clearFailedAttempts)(userId);
    (0, socket_1.forceLogoutOtherSessions)(userId);
    await (0, session_1.revokeSession)(userId);
    return {
        message: 'رمز عوض شد. دوباره وارد شو',
    };
}
