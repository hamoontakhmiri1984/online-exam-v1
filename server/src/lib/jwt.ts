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
  // Preserve the remember-me policy during token refresh.
  rememberMe: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: durationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
  });
}

const ROLES: Role[] = ['SuperAdmin', 'Instructor', 'Student'];

// Reject reset-ticket payloads even though they share the access-token signing secret.
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as Partial<AccessTokenPayload> & { purpose?: unknown };

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
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  }) as Partial<RefreshTokenPayload> & { purpose?: unknown };

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    typeof payload.rememberMe !== 'boolean' ||
    payload.purpose !== undefined
  ) {
    throw new Error('invalid refresh token');
  }

  return payload as RefreshTokenPayload;
}
