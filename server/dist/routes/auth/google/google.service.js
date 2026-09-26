"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkGoogleAccount = linkGoogleAccount;
exports.loginWithGoogle = loginWithGoogle;
const google_auth_library_1 = require("google-auth-library");
const prisma_1 = require("../../../lib/prisma");
const env_1 = require("../../../config/env");
const authTokens_1 = require("../../../lib/authTokens");
const socket_1 = require("../../../realtime/socket");
const errors_1 = require("../../../lib/errors");
const auth_helpers_1 = require("../auth.helpers");
const googleClient = new google_auth_library_1.OAuth2Client(env_1.env.GOOGLE_CLIENT_ID);
async function verifyGoogleToken(idToken) {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env_1.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
        throw (0, errors_1.badRequest)('توکن گوگل نامعتبره');
    }
    // ایمیل نرمال (lowercase) - همون فرمتی که تو دیتابیس ذخیره می‌شه
    return { sub: payload.sub, email: payload.email.toLowerCase() };
}
async function linkGoogleAccount(userId, idToken) {
    const currentUser = await prisma_1.prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!currentUser) {
        throw new errors_1.AppError(401, 'کاربر پیدا نشد');
    }
    const payload = await verifyGoogleToken(idToken);
    const owner = await prisma_1.prisma.user.findUnique({
        where: {
            googleId: payload.sub,
        },
    });
    if (owner && owner.id !== currentUser.id) {
        throw new errors_1.AppError(409, 'این حساب گوگل قبلاً به یه حساب دیگه تو همین سایت وصل شده');
    }
    const user = await prisma_1.prisma.user.update({
        where: {
            id: currentUser.id,
        },
        data: {
            googleId: payload.sub,
            ...(currentUser.email === payload.email && !currentUser.emailVerifiedAt
                ? {
                    emailVerifiedAt: new Date(),
                }
                : {}),
        },
    });
    return (0, auth_helpers_1.serializeMe)(user);
}
async function loginWithGoogle(idToken) {
    const payload = await verifyGoogleToken(idToken);
    // اول با googleId (شناسه‌ی پایدار گوگل)، بعد با ایمیل. قبلاً یه OR واحد بود
    // و اگه googleId مال یه حساب و ایمیل مال حساب دیگه بود، حساب اشتباه
    // انتخاب می‌شد
    let user = (await prisma_1.prisma.user.findUnique({
        where: {
            googleId: payload.sub,
        },
    })) ??
        (await prisma_1.prisma.user.findFirst({
            where: {
                email: payload.email,
            },
        }));
    if (!user) {
        throw new errors_1.AppError(403, 'حسابی با این ایمیل ثبت نشده. اول باید از صفحه‌ی ثبت‌نام حساب بسازی');
    }
    // ایمیل ممکنه بعداً به آدم دیگه‌ای (مثلاً ایمیل سازمانی بازیافت‌شده) با
    // حساب گوگل دیگه‌ای داده بشه؛ اگه این حساب قبلاً به یه حساب گوگلِ دیگه
    // وصل شده، فقط با ایمیل واردش نمی‌کنیم
    if (user.googleId && user.googleId !== payload.sub) {
        throw new errors_1.AppError(403, 'این ایمیل به یه حساب گوگل دیگه وصل شده. با روش قبلی وارد شو');
    }
    // حساب تایید‌نشده ممکنه رمزش رو یه نفر دیگه موقع ثبت‌نام ناتمام گذاشته باشه؛
    // صاحب واقعی ایمیل (با گوگل) تاییدش می‌کنه، پس اون رمز باید پاک بشه
    const wasNeverVerified = !user.emailVerifiedAt && !user.phoneVerifiedAt;
    if (!user.googleId || !user.emailVerifiedAt) {
        user = await prisma_1.prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                ...(wasNeverVerified
                    ? {
                        passwordHash: null,
                    }
                    : {}),
                ...(user.googleId
                    ? {}
                    : {
                        googleId: payload.sub,
                    }),
                ...(user.emailVerifiedAt
                    ? {}
                    : {
                        emailVerifiedAt: new Date(),
                    }),
            },
        });
    }
    const approvalMessage = (0, auth_helpers_1.instructorApprovalBlockMessage)(user);
    if (approvalMessage) {
        return {
            type: 'pending',
            message: approvalMessage,
        };
    }
    const { accessToken, refreshToken, sid } = await (0, authTokens_1.issueTokenPair)(user.id, user.role);
    (0, socket_1.forceLogoutOtherSessions)(user.id, sid);
    return {
        type: 'authenticated',
        accessToken,
        refreshToken,
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
