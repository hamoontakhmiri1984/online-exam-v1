"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
const prisma_1 = require("../../../lib/prisma");
const username_1 = require("../../../lib/username");
const password_1 = require("../../../lib/password");
const otp_1 = require("../../../lib/otp");
const otpAbuseGuard_1 = require("../../../lib/otpAbuseGuard");
const otpSender_1 = require("../../../services/otpSender");
const notifications_1 = require("../../../lib/notifications");
const errors_1 = require("../../../lib/errors");
const auth_helpers_1 = require("../auth.helpers");
async function registerUser(data, ip) {
    const resolved = (0, auth_helpers_1.resolveIdentifier)(data.identifier);
    if (!resolved) {
        throw (0, errors_1.badRequest)('ایمیل یا شماره موبایل نامعتبره');
    }
    const { type, value, channel } = resolved;
    await (0, otpAbuseGuard_1.assertOtpSendAllowed)({
        ip,
        identifier: value,
        captchaId: data.captchaId,
        captchaAnswer: data.captchaAnswer,
    });
    const where = type === 'EMAIL' ? { email: value } : { phone: value };
    let user = await prisma_1.prisma.user.findFirst({
        where,
    });
    const alreadyVerified = type === 'EMAIL'
        ? Boolean(user?.emailVerifiedAt)
        : Boolean(user?.phoneVerifiedAt);
    if (alreadyVerified) {
        throw (0, errors_1.badRequest)('این حساب قبلاً ثبت شده');
    }
    let username;
    if (data.username?.trim()) {
        const formatCheck = (0, username_1.validateUsernameFormat)(data.username);
        if (!formatCheck.valid) {
            throw (0, errors_1.badRequest)(formatCheck.error ?? 'نام کاربری نامعتبره');
        }
        username = (0, username_1.normalizeUsername)(data.username);
        const taken = await (0, username_1.isUsernameTaken)(username, user?.id);
        if (taken) {
            const suggestions = await (0, username_1.suggestUsernameAlternatives)(data.username);
            return {
                status: 'username_taken',
                message: 'این نام کاربری قبلاً گرفته شده',
                usernameSuggestions: suggestions,
            };
        }
    }
    else {
        const baseUsername = type === 'EMAIL' ? value.split('@')[0] : `user${value.slice(-6)}`;
        const suggestions = await (0, username_1.suggestUsernameAlternatives)(baseUsername);
        username =
            suggestions[0] ??
                `${(0, username_1.normalizeUsername)(baseUsername)}${Date.now().toString().slice(-4)}`;
    }
    let passwordHash = null;
    if (data.password) {
        passwordHash = await (0, password_1.hashPassword)(data.password);
    }
    let groupId = null;
    if (data.role === 'Student' && data.joinCode?.trim()) {
        const joinCode = data.joinCode.trim().toUpperCase();
        const group = await prisma_1.prisma.group.findUnique({
            where: {
                joinCode,
            },
        });
        if (!group) {
            throw (0, errors_1.badRequest)('کد دعوت نامعتبره');
        }
        groupId = group.id;
    }
    const isNewUser = !user;
    if (!user) {
        user = await prisma_1.prisma.user.create({
            data: {
                username,
                usernameNormalized: (0, username_1.normalizeUsername)(username),
                name: data.name?.trim() || null,
                passwordHash,
                role: data.role,
                approvalStatus: data.role === 'Instructor' ? 'Pending' : 'Approved',
                ...(type === 'EMAIL'
                    ? {
                        email: value,
                    }
                    : {
                        phone: value,
                    }),
                ...(groupId
                    ? {
                        groupsMember: {
                            connect: {
                                id: groupId,
                            },
                        },
                    }
                    : {}),
            },
        });
    }
    else {
        user = await prisma_1.prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                username,
                usernameNormalized: (0, username_1.normalizeUsername)(username),
                name: data.name?.trim() || user.name,
                // این کاربر هنوز تایید نشده (alreadyVerified بالا رد شده) - رمز قبلیش
                // رو کسی گذاشته که مالکیت شناسه رو ثابت نکرده. اگه اینجا حفظ بشه
                // (`?? user.passwordHash`)، یه نفر می‌تونست ایمیل/شماره‌ی قربانی رو
                // با رمز خودش پیش‌ثبت‌نام کنه و بعد از اینکه صاحب واقعی بدون رمز
                // ثبت‌نام و تایید کرد، با اون رمز وارد حسابش بشه.
                passwordHash,
                role: data.role,
                approvalStatus: data.role === 'Instructor' ? 'Pending' : 'Approved',
                // کد دعوت تلاش دوم (بعد از ثبت‌نام ناتمام) قبلاً نادیده گرفته می‌شد
                groupsMember: {
                    set: groupId ? [{ id: groupId }] : [],
                },
            },
        });
    }
    if (isNewUser) {
        await (0, notifications_1.notifyUser)(user.id, 'ثبت‌نام با موفقیت انجام شد', 'info').catch((error) => {
            console.error('notifyUser failed:', error);
        });
        if (data.role === 'Instructor') {
            await (0, notifications_1.notifyRoles)(['SuperAdmin'], `مدرس جدید ${user.name || user.username} منتظر تایید حساب است`, 'people').catch((error) => {
                console.error('notifyRoles failed:', error);
            });
        }
    }
    const { code } = await (0, otp_1.createOtp)({
        identifier: value,
        channel,
        purpose: 'REGISTER',
        userId: user.id,
    });
    try {
        await (0, otpSender_1.sendOtp)({
            identifier: value,
            channel,
            code,
        });
    }
    catch (error) {
        console.error('sendOtp failed:', error);
        throw new errors_1.AppError(502, 'ارسال کد تایید ناموفق بود، دوباره تلاش کن');
    }
    return {
        status: 'otp_sent',
        identifier: value,
    };
}
