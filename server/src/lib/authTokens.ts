import crypto from 'crypto';
import type { Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { signAccessToken, signRefreshToken } from './jwt';

import { createSession, rotateSessionWithGrace } from './session';

import { durationToSeconds } from './duration';
import { redis } from './redis';

import type { Role } from './jwt';

const REFRESH_COOKIE_NAME = 'refreshToken';

const REFRESH_MAX_AGE_MS = durationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000;

const RESET_TICKET_TTL_SECONDS = 10 * 60;

interface ResetTicketPayload {
  sub: string;
  purpose: 'RESET_PASSWORD';
  jti: string;
}

const resetTicketKey = (jti: string) => `reset-ticket:${jti}`;

export function setRefreshCookie(
  res: Response,
  token: string,
  persistent = true
) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
    ...(persistent ? { maxAge: REFRESH_MAX_AGE_MS } : {}),
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    path: '/auth',
  });
}

export function getRefreshCookieName() {
  return REFRESH_COOKIE_NAME;
}

export async function issueTokenPair(
  userId: string,
  role: Role,
  rememberMe = true
) {
  const sid = await createSession(userId);

  const accessToken = signAccessToken({
    sub: userId,
    role,
    sid,
  });

  const refreshToken = signRefreshToken({
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
export async function issueRefreshedTokenPair(
  userId: string,
  role: Role,
  currentSid: string,
  rememberMe: boolean
) {
  const sid = await rotateSessionWithGrace(userId, currentSid);
  if (sid === null) return null;

  const accessToken = signAccessToken({
    sub: userId,
    role,
    sid,
  });

  const refreshToken = signRefreshToken({
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

export async function signResetTicket(userId: string): Promise<string> {
  const jti = crypto.randomUUID();

  const payload: ResetTicketPayload = {
    sub: userId,
    purpose: 'RESET_PASSWORD',
    jti,
  };

  await redis.set(resetTicketKey(jti), userId, {
    EX: RESET_TICKET_TTL_SECONDS,
  });

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: RESET_TICKET_TTL_SECONDS,
  });
}

export async function verifyResetTicket(
  token: string
): Promise<ResetTicketPayload> {
  const payload = jwt.verify(
    token,
    env.JWT_ACCESS_SECRET
  ) as ResetTicketPayload;

  if (payload.purpose !== 'RESET_PASSWORD' || !payload.jti) {
    throw new Error('invalid reset ticket');
  }

  const key = resetTicketKey(payload.jti);

  const storedUserId = await redis.getDel(key);

  if (!storedUserId || storedUserId !== payload.sub) {
    throw new Error('reset ticket already used or expired');
  }

  return payload;
}
