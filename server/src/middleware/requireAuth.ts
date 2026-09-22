import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt';
import { isSessionValid } from '../lib/session';
import { prisma } from '../lib/prisma';
import { instructorApprovalBlockMessage } from '../lib/accountAccess';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'توکن ارسال نشده' });
  }

  const token = header.slice('Bearer '.length);

  // فقط شکست در «تأیید امضا/انقضای توکن» یعنی ۴۰۱. قبلاً کل بلوک (از جمله
  // خوندن نشست از Redis) تو یه catch بود، پس قطعیِ Redis هم ۴۰۱ می‌شد و
  // کلاینت با فرض «نشست تموم شده» کاربر رو از سیستم خارج می‌کرد
  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده' });
  }

  // requireAuth تحت asyncHandler نیست (Express 4 رد شدنِ promise رو نمی‌گیره)،
  // پس خطای مخزن نشست (AppError ۵۰۳) رو صریح به errorHandler می‌دیم
  let valid: boolean;
  try {
    valid = await isSessionValid(payload.sub, payload.sid);
  } catch (err) {
    return next(err);
  }
  if (!valid) {
    return res.status(401).json({ error: 'این نشست دیگر معتبر نیست (از جای دیگری وارد شدید)' });
  }

  // ردشدن حساب باید حتی پس از شکست ابطال نشست Redis اعمال شود.
  if (payload.role === 'Instructor') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role: true, approvalStatus: true },
      });
      if (!user || user.role !== payload.role) {
        return res.status(401).json({ error: 'حساب یا نقش کاربر دیگر معتبر نیست' });
      }
      const message = instructorApprovalBlockMessage(user);
      if (message) return res.status(401).json({ error: message });
    } catch (err) {
      return next(err);
    }
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: AccessTokenPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
  };
}