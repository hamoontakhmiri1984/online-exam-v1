"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jwt_1 = require("../lib/jwt");
const session_1 = require("../lib/session");
const prisma_1 = require("../lib/prisma");
const accountAccess_1 = require("../lib/accountAccess");
async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'توکن ارسال نشده' });
    }
    const token = header.slice('Bearer '.length);
    // فقط شکست در «تأیید امضا/انقضای توکن» یعنی ۴۰۱. قبلاً کل بلوک (از جمله
    // خوندن نشست از Redis) تو یه catch بود، پس قطعیِ Redis هم ۴۰۱ می‌شد و
    // کلاینت با فرض «نشست تموم شده» کاربر رو از سیستم خارج می‌کرد
    let payload;
    try {
        payload = (0, jwt_1.verifyAccessToken)(token);
    }
    catch {
        return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده' });
    }
    // requireAuth تحت asyncHandler نیست (Express 4 رد شدنِ promise رو نمی‌گیره)،
    // پس خطای مخزن نشست (AppError ۵۰۳) رو صریح به errorHandler می‌دیم
    let valid;
    try {
        valid = await (0, session_1.isSessionValid)(payload.sub, payload.sid);
    }
    catch (err) {
        return next(err);
    }
    if (!valid) {
        return res.status(401).json({ error: 'این نشست دیگر معتبر نیست (از جای دیگری وارد شدید)' });
    }
    // ردشدن حساب باید حتی پس از شکست ابطال نشست Redis اعمال شود.
    if (payload.role === 'Instructor') {
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { role: true, approvalStatus: true },
            });
            if (!user || user.role !== payload.role) {
                return res.status(401).json({ error: 'حساب یا نقش کاربر دیگر معتبر نیست' });
            }
            const message = (0, accountAccess_1.instructorApprovalBlockMessage)(user);
            if (message)
                return res.status(401).json({ error: message });
        }
        catch (err) {
            return next(err);
        }
    }
    req.user = payload;
    next();
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }
        next();
    };
}
