import { logEvent } from './logger';
import crypto from 'crypto';
import { redis } from './redis';
import { env } from '../config/env';
import { durationToSeconds } from './duration';
import { AppError } from './errors';

const userKeyPart = (userId: string) => encodeURIComponent(userId);
const sessionsKey = (userId: string) => `sessions:v2:{${userKeyPart(userId)}}`;
const rotationAliasesKey = (userId: string) =>
  `sessions:v2:{${userKeyPart(userId)}}:rotated`;
const legacySessionKey = (userId: string) => `session:${userId}`;
const legacyRotatedKey = (userId: string) => `session:${userId}:rotated`;
const legacyMigrationMarkerKey = (userId: string) =>
  `sessions:v2:{${userKeyPart(userId)}}:legacy-migrated`;
const REFRESH_TTL_SECONDS = durationToSeconds(env.JWT_REFRESH_EXPIRES_IN);
const GRACE_WINDOW_SECONDS = 10;
const SESSION_STORE_TIMEOUT_MS = 2_000;
export const MAX_SESSIONS_PER_USER = 5;

export async function withSessionStore<T>(op: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      op(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('session store timeout')),
          SESSION_STORE_TIMEOUT_MS,
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

/**
 * Migrate old, non-cluster-tagged keys outside Lua. A marker means the legacy
 * keys are never read again on subsequent authenticated requests.
 */
async function migrateLegacySession(userId: string): Promise<void> {
  const markerKey = legacyMigrationMarkerKey(userId);
  if (await redis.exists(markerKey)) return;

  const oldSessionKey = legacySessionKey(userId);
  const oldAliasesKey = legacyRotatedKey(userId);
  const [legacySid, legacyAliases, sessionTtl, aliasesTtl] = await Promise.all([
    redis.get(oldSessionKey),
    redis.hGetAll(oldAliasesKey),
    redis.ttl(oldSessionKey),
    redis.ttl(oldAliasesKey),
  ]);

  const now = Date.now() / 1000;
  if (legacySid) {
    const ttl = sessionTtl > 0 ? sessionTtl : REFRESH_TTL_SECONDS;
    await redis.zAdd(sessionsKey(userId), [
      { score: now + ttl, value: legacySid },
    ]);
  }

  const migratedAliases: Record<string, string> = {};
  const aliasTtl = aliasesTtl > 0 ? aliasesTtl : GRACE_WINDOW_SECONDS;
  const aliasExpiresAt = now + aliasTtl;
  for (const [oldSid, nextSid] of Object.entries(legacyAliases)) {
    // UUID SIDs contain no colon. Keep each alias's original grace expiry.
    migratedAliases[oldSid] = `${nextSid}:${aliasExpiresAt}`;
  }
  if (Object.keys(migratedAliases).length > 0) {
    await redis.hSet(rotationAliasesKey(userId), migratedAliases);
    await redis.expire(rotationAliasesKey(userId), REFRESH_TTL_SECONDS);
  }
  if (legacySid || Object.keys(migratedAliases).length > 0) {
    await redis.expire(sessionsKey(userId), REFRESH_TTL_SECONDS);
  }

  await redis.del(oldSessionKey);
  await redis.del(oldAliasesKey);
  await redis.set(markerKey, '1');
}

export const CREATE_SESSION_SCRIPT = [
  "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[1]))",
  "redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + tonumber(ARGV[2]), ARGV[3])",
  "while redis.call('ZCARD', KEYS[1]) > tonumber(ARGV[4]) do",
  "  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0)",
  '  if #oldest == 0 then break end',
  "  redis.call('ZREM', KEYS[1], oldest[1])",
  'end',
  "redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))",
  'return ARGV[3]',
].join('\n');

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = Date.now() / 1000;
  await withSessionStore(async () => {
    await migrateLegacySession(userId);
    await redis.eval(CREATE_SESSION_SCRIPT, {
      keys: [sessionsKey(userId)],
      arguments: [
        String(now),
        String(REFRESH_TTL_SECONDS),
        sessionId,
        String(MAX_SESSIONS_PER_USER),
      ],
    });
  });
  return sessionId;
}

export async function getActiveSessionId(
  userId: string,
): Promise<string | null> {
  const now = Date.now() / 1000;
  return withSessionStore(async () => {
    const key = sessionsKey(userId);
    await redis.zRemRangeByScore(key, '-inf', now);
    const sessions = await redis.zRange(key, 0, 0, { REV: true });
    return sessions[0] ?? null;
  });
}

export const VALIDATE_SESSION_SCRIPT = [
  'local current = ARGV[2]',
  'for i = 1, 10 do',
  "  local expiry = redis.call('ZSCORE', KEYS[1], current)",
  '  if expiry and tonumber(expiry) > tonumber(ARGV[1]) then return 1 end',
  "  local alias = redis.call('HGET', KEYS[2], current)",
  '  if not alias then return 0 end',
  "  local separator = string.find(alias, ':', 1, true)",
  '  if not separator then return 0 end',
  '  local nextSid = string.sub(alias, 1, separator - 1)',
  '  local aliasExpiry = tonumber(string.sub(alias, separator + 1))',
  '  if not aliasExpiry or aliasExpiry <= tonumber(ARGV[1]) then return 0 end',
  '  current = nextSid',
  'end',
  'return 0',
].join('\n');

export async function isSessionValid(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const now = Date.now() / 1000;
  const result = await withSessionStore(async () => {
    await migrateLegacySession(userId);
    return redis.eval(VALIDATE_SESSION_SCRIPT, {
      keys: [sessionsKey(userId), rotationAliasesKey(userId)],
      arguments: [String(now), sessionId],
    });
  });
  return Number(result) === 1;
}

export const ROTATE_SESSION_SCRIPT = [
  'local current = ARGV[4]',
  'local followedAlias = false',
  'for i = 1, 10 do',
  "  local expiry = redis.call('ZSCORE', KEYS[1], current)",
  '  if expiry and tonumber(expiry) > tonumber(ARGV[1]) then',
  '    if followedAlias then return current end',
  "    redis.call('ZREM', KEYS[1], current)",
  "    redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + tonumber(ARGV[2]), ARGV[5])",
  "    redis.call('HSET', KEYS[2], current, ARGV[5] .. ':' .. (tonumber(ARGV[1]) + tonumber(ARGV[3])))",
  "    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))",
  "    redis.call('EXPIRE', KEYS[2], tonumber(ARGV[2]))",
  '    return ARGV[5]',
  '  end',
  "  local alias = redis.call('HGET', KEYS[2], current)",
  '  if not alias then return false end',
  "  local separator = string.find(alias, ':', 1, true)",
  '  if not separator then return false end',
  '  local nextSid = string.sub(alias, 1, separator - 1)',
  '  local aliasExpiry = tonumber(string.sub(alias, separator + 1))',
  '  if not aliasExpiry or aliasExpiry <= tonumber(ARGV[1]) then return false end',
  '  current = nextSid',
  '  followedAlias = true',
  'end',
  'return false',
].join('\n');

export async function rotateSessionWithGrace(
  userId: string,
  currentSessionId: string,
): Promise<string | null> {
  const candidateSessionId = crypto.randomUUID();
  const now = Date.now() / 1000;
  const result = await withSessionStore(async () => {
    await migrateLegacySession(userId);
    return redis.eval(ROTATE_SESSION_SCRIPT, {
      keys: [sessionsKey(userId), rotationAliasesKey(userId)],
      arguments: [
        String(now),
        String(REFRESH_TTL_SECONDS),
        String(GRACE_WINDOW_SECONDS),
        currentSessionId,
        candidateSessionId,
      ],
    });
  });
  return typeof result === 'string' && result.length > 0 ? result : null;
}

export const REVOKE_ONE_SESSION_SCRIPT = [
  'local current = ARGV[3]',
  'for i = 1, 10 do',
  "  local expiry = redis.call('ZSCORE', KEYS[1], current)",
  '  if expiry and tonumber(expiry) > tonumber(ARGV[1]) then',
  "    redis.call('ZREM', KEYS[1], current)",
  "    redis.call('HDEL', KEYS[2], current)",
  "    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))",
  '    return current',
  '  end',
  "  local alias = redis.call('HGET', KEYS[2], current)",
  '  if not alias then return false end',
  "  local separator = string.find(alias, ':', 1, true)",
  '  if not separator then return false end',
  '  local nextSid = string.sub(alias, 1, separator - 1)',
  '  local aliasExpiry = tonumber(string.sub(alias, separator + 1))',
  '  if not aliasExpiry or aliasExpiry <= tonumber(ARGV[1]) then return false end',
  '  current = nextSid',
  'end',
  'return false',
].join('\n');

// With a SID, revoke only that logical device session (following its rotation aliases).
// Without a SID, revoke every device session for password reset or account rejection.
export async function revokeSession(
  userId: string,
  sessionId?: string,
): Promise<string | null> {
  if (!sessionId) {
    await withSessionStore(async () => {
      await migrateLegacySession(userId);
      await redis.del([sessionsKey(userId), rotationAliasesKey(userId)]);
      await redis.del(legacySessionKey(userId));
      await redis.del(legacyRotatedKey(userId));
    });
    return null;
  }

  const now = Date.now() / 1000;
  const result = await withSessionStore(async () => {
    await migrateLegacySession(userId);
    return redis.eval(REVOKE_ONE_SESSION_SCRIPT, {
      keys: [sessionsKey(userId), rotationAliasesKey(userId)],
      arguments: [String(now), String(REFRESH_TTL_SECONDS), sessionId],
    });
  });
  return typeof result === 'string' && result.length > 0 ? result : null;
}
