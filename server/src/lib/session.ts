import { logEvent } from './logger';
import crypto from 'crypto';
import { redis } from './redis';
import { env } from '../config/env';
import { durationToSeconds } from './duration';
import { AppError } from './errors';

const sessionKey = (userId: string) => `session:${userId}`;
// Use a distinct hash key for rotation mappings to avoid legacy string-key type conflicts.
const rotatedKey = (userId: string) => `session:${userId}:rotated`;
const REFRESH_TTL_SECONDS = durationToSeconds(env.JWT_REFRESH_EXPIRES_IN);

// The grace window supports concurrent refreshes, not simultaneous device sessions.
const GRACE_WINDOW_SECONDS = 10;

// Redis outages are 503; only an invalid session is 401.
const SESSION_STORE_TIMEOUT_MS = 2_000;

export async function withSessionStore<T>(op: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      op(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('session store timeout')),
          SESSION_STORE_TIMEOUT_MS
        );
      }),
    ]);
  } catch (err) {
    logEvent('error', 'session store unavailable:', err);
    throw new AppError(503, 'سرویس نشست موقتاً در دسترس نیست');
  } finally {
    clearTimeout(timer);
  }
}

// Create the new session and clear old rotation mappings atomically.
export const CREATE_SESSION_SCRIPT = `
redis.call('DEL', KEYS[2])
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
return ARGV[1]
`;

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  // A fresh login invalidates all prior refresh-rotation mappings.
  await withSessionStore(() =>
    redis.eval(CREATE_SESSION_SCRIPT, {
      keys: [sessionKey(userId), rotatedKey(userId)],
      arguments: [sessionId, String(REFRESH_TTL_SECONDS)],
    })
  );
  return sessionId;
}

export async function getActiveSessionId(
  userId: string
): Promise<string | null> {
  return withSessionStore(() => redis.get(sessionKey(userId)));
}

// Read the current SID and rotation mapping atomically with logout/login.
export const VALIDATE_SESSION_SCRIPT = `
local active = redis.call('GET', KEYS[1])
if not active then return 0 end
if active == ARGV[1] then return 1 end
if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 1 then return 1 end
return 0
`;

export async function isSessionValid(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const result = await withSessionStore(() =>
    redis.eval(VALIDATE_SESSION_SCRIPT, {
      keys: [sessionKey(userId), rotatedKey(userId)],
      arguments: [sessionId],
    })
  );
  return Number(result) === 1;
}

// Rotate atomically; concurrent requests using one old SID share the same replacement.
export const ROTATE_SESSION_SCRIPT = `
local active = redis.call('GET', KEYS[1])
if active == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[4]))
  return ARGV[2]
end
if active and redis.call('HEXISTS', KEYS[2], ARGV[1]) == 1 then
  return active
end
return false
`;

export async function rotateSessionWithGrace(
  userId: string,
  currentSessionId: string
): Promise<string | null> {
  const candidateSessionId = crypto.randomUUID();

  const result = await withSessionStore(() =>
    redis.eval(ROTATE_SESSION_SCRIPT, {
      keys: [sessionKey(userId), rotatedKey(userId)],
      arguments: [
        currentSessionId,
        candidateSessionId,
        String(REFRESH_TTL_SECONDS),
        String(GRACE_WINDOW_SECONDS),
      ],
    })
  );

  return typeof result === 'string' && result.length > 0 ? result : null;
}

// Delete the session and its rotation mappings in one atomic command.
export async function revokeSession(userId: string): Promise<void> {
  await withSessionStore(() =>
    redis.del([sessionKey(userId), rotatedKey(userId)])
  );
}
