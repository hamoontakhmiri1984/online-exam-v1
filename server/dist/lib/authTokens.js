"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRefreshCookie = setRefreshCookie;
exports.clearRefreshCookie = clearRefreshCookie;
exports.getRefreshCookieName = getRefreshCookieName;
exports.issueTokenPair = issueTokenPair;
exports.issueRefreshedTokenPair = issueRefreshedTokenPair;
exports.signResetTicket = signResetTicket;
exports.verifyResetTicket = verifyResetTicket;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const jwt_1 = require("./jwt");
const session_1 = require("./session");
const duration_1 = require("./duration");
const redis_1 = require("./redis");
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_MAX_AGE_MS = (0, duration_1.durationToSeconds)(env_1.env.JWT_REFRESH_EXPIRES_IN) * 1000;
const RESET_TICKET_TTL_SECONDS = 10 * 60;
const resetTicketKey = (jti) => `reset-ticket:${jti}`;
function setRefreshCookie(res, token, persistent = true) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        ...(persistent ? { maxAge: REFRESH_MAX_AGE_MS } : {}),
    });
}
function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
        path: '/auth',
    });
}
function getRefreshCookieName() {
    return REFRESH_COOKIE_NAME;
}
async function issueTokenPair(userId, role, rememberMe = true) {
    const sid = await (0, session_1.createSession)(userId);
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: userId,
        role,
        sid,
    });
    const refreshToken = (0, jwt_1.signRefreshToken)({
        sub: userId,
        sid,
        rememberMe,
    });
    return {
        accessToken,
        refreshToken,
        sid,
        rememberMe,
    };
}
// null یعنی sid درخواست دیگه معتبر نیست (logout شده یا از دستگاه دیگه لاگین
// شده) - route باید 401 بده. درخواست‌های هم‌زمان با *همون* sid قدیمی، همه
// همون sid جدید رو می‌گیرن (نگاه کن به rotateSessionWithGrace)
async function issueRefreshedTokenPair(userId, role, currentSid, rememberMe) {
    const sid = await (0, session_1.rotateSessionWithGrace)(userId, currentSid);
    if (sid === null)
        return null;
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: userId,
        role,
        sid,
    });
    const refreshToken = (0, jwt_1.signRefreshToken)({
        sub: userId,
        sid,
        rememberMe,
    });
    return {
        accessToken,
        refreshToken,
        sid,
    };
}
async function signResetTicket(userId) {
    const jti = crypto_1.default.randomUUID();
    const payload = {
        sub: userId,
        purpose: 'RESET_PASSWORD',
        jti,
    };
    await redis_1.redis.set(resetTicketKey(jti), userId, {
        EX: RESET_TICKET_TTL_SECONDS,
    });
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: RESET_TICKET_TTL_SECONDS,
    });
}
async function verifyResetTicket(token) {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
    if (payload.purpose !== 'RESET_PASSWORD' || !payload.jti) {
        throw new Error('invalid reset ticket');
    }
    const key = resetTicketKey(payload.jti);
    const storedUserId = await redis_1.redis.getDel(key);
    if (!storedUserId || storedUserId !== payload.sub) {
        throw new Error('reset ticket already used or expired');
    }
    return payload;
}
