import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { verifyAccessToken, verifyRefreshToken } from '../../lib/jwt';
import { getRefreshCookieName, issueRefreshedTokenPair } from '../../lib/authTokens';
import { isSessionValid, revokeSession } from '../../lib/session';
import { instructorApprovalBlockMessage } from '../../lib/accountAccess';
import { AppError } from '../../lib/errors';
import { forceLogoutOtherSessions } from '../../realtime/socket';

export async function refreshUserSession(token: string | undefined) {
  if (!token) throw new AppError(401, 'refresh token موجود نیست');

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'refresh token نامعتبر یا منقضی‌شده');
  }

  // خطای زیرساخت باید مستقل از نامعتبر بودن نشست به بالا منتقل شود.
  if (!(await isSessionValid(payload.sub, payload.sid))) {
    throw new AppError(401, 'نشست دیگر معتبر نیست');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new AppError(401, 'کاربر پیدا نشد');

  const approvalMessage = instructorApprovalBlockMessage(user);
  if (approvalMessage) {
    await revokeSession(user.id).catch((error) => {
      console.error('revokeSession (blocked instructor) failed:', error);
    });
    forceLogoutOtherSessions(user.id, undefined, 'account-rejected');
    // فرانت 401 را پایان نشست می‌داند؛ 403 را اختلال موقت تلقی می‌کند.
    throw new AppError(401, approvalMessage);
  }

  const tokens = await issueRefreshedTokenPair(
    user.id, user.role, payload.sid, payload.rememberMe
  );
  if (!tokens) throw new AppError(401, 'نشست دیگر معتبر نیست');
  return { ...tokens, rememberMe: payload.rememberMe };
}

export async function resolveLogoutSubject(req: Request): Promise<string | null> {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    let payload: ReturnType<typeof verifyAccessToken> | null = null;
    try {
      payload = verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      // به refresh cookie می‌رسیم
    }
    if (payload && (await isSessionValid(payload.sub, payload.sid))) {
      return payload.sub;
    }
  }

  const cookie = req.cookies?.[getRefreshCookieName()];
  if (cookie) {
    let payload: ReturnType<typeof verifyRefreshToken> | null = null;
    try {
      payload = verifyRefreshToken(cookie);
    } catch {
      // نامعتبر - فقط کوکی پاک می‌شه
    }
    if (payload && (await isSessionValid(payload.sub, payload.sid))) {
      return payload.sub;
    }
  }

  return null;
}

