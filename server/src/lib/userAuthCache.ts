import { logEvent } from './logger';

async function loadRedis() {
  const redisModule = await import('./redis');
  return redisModule.redis;
}

export type UserAuthSnapshot = {
  role: 'SuperAdmin' | 'Instructor' | 'Student';
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
};

const AUTH_CACHE_TTL_SECONDS = 30;
const GENERATION_TTL_SECONDS = 30 * 24 * 60 * 60;
const generationKey = (userId: string) =>
  'authz:user:' + userId + ':generation';
const snapshotKey = (userId: string, generation: string) =>
  'authz:user:' + userId + ':snapshot:' + generation;

function parseSnapshot(value: string): UserAuthSnapshot | null | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null) return null;
    if (!parsed || typeof parsed !== 'object') return undefined;

    const row = parsed as Record<string, unknown>;
    const validRole = ['SuperAdmin', 'Instructor', 'Student'].includes(
      String(row.role),
    );
    const validApproval = ['Pending', 'Approved', 'Rejected'].includes(
      String(row.approvalStatus),
    );
    if (!validRole || !validApproval) return undefined;

    return {
      role: row.role as UserAuthSnapshot['role'],
      approvalStatus: row.approvalStatus as UserAuthSnapshot['approvalStatus'],
    };
  } catch {
    return undefined;
  }
}

/**
 * Cache only authorization fields; generation changes make stale cache fills
 * unreachable.
 */
export async function getUserAuthSnapshot(
  userId: string,
  loadUser: () => Promise<UserAuthSnapshot | null>,
): Promise<UserAuthSnapshot | null> {
  let redis: Awaited<ReturnType<typeof loadRedis>>;
  try {
    redis = await loadRedis();
  } catch {
    // Authorization remains correct if cache infrastructure is unavailable.
    return loadUser();
  }

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const versionKey = generationKey(userId);
      const generation = (await redis.get(versionKey)) ?? '0';
      const key = snapshotKey(userId, generation);
      const cached = await redis.get(key);

      if (cached !== null) {
        const parsed = parseSnapshot(cached);
        const currentGeneration = (await redis.get(versionKey)) ?? '0';
        if (currentGeneration !== generation) continue;
        if (parsed !== undefined) return parsed;
        await redis.del(key);
      }

      const snapshot = await loadUser();
      const currentGeneration = (await redis.get(versionKey)) ?? '0';
      if (currentGeneration !== generation) continue;

      await redis.set(key, JSON.stringify(snapshot), {
        EX: AUTH_CACHE_TTL_SECONDS,
      });
      return snapshot;
    }

    return loadUser();
  } catch {
    // Redis is a performance layer; Prisma remains the authoritative source.
    return loadUser();
  }
}

const INVALIDATE_AUTH_CACHE_SCRIPT = [
  "local generation = redis.call('INCR', KEYS[1])",
  "redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))",
  'return generation',
].join('; ');

export async function invalidateUserAuthCache(userId: string): Promise<void> {
  try {
    const redis = await loadRedis();
    await redis.eval(INVALIDATE_AUTH_CACHE_SCRIPT, {
      keys: [generationKey(userId)],
      arguments: [String(GENERATION_TTL_SECONDS)],
    });
  } catch {
    // Snapshots expire after 30 seconds even if explicit invalidation is unavailable.
    logEvent('error', 'auth_cache_invalidation_failed', new Error('Failed to invalidate account authorization cache'));
  }
}
