"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshUserSession = refreshUserSession;
exports.resolveLogoutSubject = resolveLogoutSubject;
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("../../lib/jwt");
const authTokens_1 = require("../../lib/authTokens");
const session_1 = require("../../lib/session");
const accountAccess_1 = require("../../lib/accountAccess");
const errors_1 = require("../../lib/errors");
const socket_1 = require("../../realtime/socket");
async function refreshUserSession(token) {
    if (!token)
        throw new errors_1.AppError(401, 'refresh token موجود نیست');
    let payload;
    try {
        payload = (0, jwt_1.verifyRefreshToken)(token);
    }
    catch {
        throw new errors_1.AppError(401, 'refresh token نامعتبر یا منقضی‌شده');
    }
    // خطای زیرساخت باید مستقل از نامعتبر بودن نشست به بالا منتقل شود.
    if (!(await (0, session_1.isSessionValid)(payload.sub, payload.sid))) {
        throw new errors_1.AppError(401, 'نشست دیگر معتبر نیست');
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user)
        throw new errors_1.AppError(401, 'کاربر پیدا نشد');
    const approvalMessage = (0, accountAccess_1.instructorApprovalBlockMessage)(user);
    if (approvalMessage) {
        await (0, session_1.revokeSession)(user.id).catch((error) => {
            console.error('revokeSession (blocked instructor) failed:', error);
        });
        (0, socket_1.forceLogoutOtherSessions)(user.id, undefined, 'account-rejected');
        // فرانت 401 را پایان نشست می‌داند؛ 403 را اختلال موقت تلقی می‌کند.
        throw new errors_1.AppError(401, approvalMessage);
    }
    const tokens = await (0, authTokens_1.issueRefreshedTokenPair)(user.id, user.role, payload.sid, payload.rememberMe);
    if (!tokens)
        throw new errors_1.AppError(401, 'نشست دیگر معتبر نیست');
    return { ...tokens, rememberMe: payload.rememberMe };
}
async function resolveLogoutSubject(req) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        let payload = null;
        try {
            payload = (0, jwt_1.verifyAccessToken)(header.slice('Bearer '.length));
        }
        catch {
            // به refresh cookie می‌رسیم
        }
        if (payload && (await (0, session_1.isSessionValid)(payload.sub, payload.sid))) {
            return payload.sub;
        }
    }
    const cookie = req.cookies?.[(0, authTokens_1.getRefreshCookieName)()];
    if (cookie) {
        let payload = null;
        try {
            payload = (0, jwt_1.verifyRefreshToken)(cookie);
        }
        catch {
            // نامعتبر - فقط کوکی پاک می‌شه
        }
        if (payload && (await (0, session_1.isSessionValid)(payload.sub, payload.sid))) {
            return payload.sub;
        }
    }
    return null;
}
