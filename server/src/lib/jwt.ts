import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { durationToSeconds } from './duration';

export type Role = 'SuperAdmin' | 'Instructor' | 'Student';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  sid: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  // باید موقع /refresh هم همین مقدار حفظ بشه، وگرنه یه کاربر که «منو به خاطر
  // نسپار» رو زده بود، بعد از اولین refresh کوکیش persistent می‌شه و عملاً
  // remember-me=false بی‌اثر می‌مونه
  rememberMe: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: durationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
  });
}

const ROLES: Role[] = ['SuperAdmin', 'Instructor', 'Student'];

// reset-ticket هم با JWT_ACCESS_SECRET امضا می‌شه؛ برای اینکه هیچ‌وقت به‌جای
// access token پذیرفته نشه، شکل payload صریحاً چک می‌شه (sub/sid/role)
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(
    token,
    env.JWT_ACCESS_SECRET
  ) as Partial<AccessTokenPayload> & { purpose?: unknown };

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    !ROLES.includes(payload.role as Role) ||
    payload.purpose !== undefined
  ) {
    throw new Error('invalid access token');
  }
  return payload as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
