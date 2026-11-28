import { createHash } from 'node:crypto';
import { redis } from './redis';
import { durationToSeconds } from './duration';

// Account/IP limits resist local guessing; a separate account limit bounds distributed attacks.
export const MAX_FAILED_ATTEMPTS = 5;
export const MAX_FAILED_ATTEMPTS_ANY_IP = 30;
const FAILED_ATTEMPTS_WINDOW = '15m';
const LOCKOUT_DURATION = '15m';
const GENERATION_TTL_SECONDS = 7 * 24 * 60 * 60;

const failKey = (userId: string) => `login:fail:${userId}`;
const lockKey = (userId: string) => `login:lock:${userId}`;
// Bump the generation to invalidate IP counters without scanning Redis keys.
const generationKey = (userId: string) => `login:gen:${userId}`;
const accountIpFailKey = (userId: string, generation: string, ip: string) =>
  `login:fail:${userId}:${generation}:${ip}`;
const accountIpLockKey = (userId: string, generation: string, ip: string) =>
  `login:lock:${userId}:${generation}:${ip}`;

// Set the counter and expiry atomically so no permanent lockout key remains.
const INCR_WITH_TTL_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return count
`;

async function incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
  const count = await redis.eval(INCR_WITH_TTL_SCRIPT, {
    keys: [key],
    arguments: [String(ttlSeconds)],
  });
  return Number(count);
}

async function currentGeneration(userId: string): Promise<string> {
  return (await redis.get(generationKey(userId))) ?? '0';
}

export async function isAccountLocked(
  userId: string,
  ip = 'unknown',
): Promise<boolean> {
  const generation = await currentGeneration(userId);
  const [anyIpLock, thisIpLock] = await Promise.all([
    redis.get(lockKey(userId)),
    redis.get(accountIpLockKey(userId, generation, ip)),
  ]);
  return anyIpLock !== null || thisIpLock !== null;
}

export async function registerFailedAttempt(
  userId: string,
  ip = 'unknown',
): Promise<number> {
  const generation = await currentGeneration(userId);
  const windowSeconds = durationToSeconds(FAILED_ATTEMPTS_WINDOW);
  const lockSeconds = durationToSeconds(LOCKOUT_DURATION);

  const [ipCount, totalCount] = await Promise.all([
    incrWithTtl(accountIpFailKey(userId, generation, ip), windowSeconds),
    incrWithTtl(failKey(userId), windowSeconds),
  ]);

  if (ipCount >= MAX_FAILED_ATTEMPTS) {
    await redis.set(accountIpLockKey(userId, generation, ip), '1', {
      EX: lockSeconds,
    });
  }
  if (totalCount >= MAX_FAILED_ATTEMPTS_ANY_IP) {
    await redis.set(lockKey(userId), '1', { EX: lockSeconds });
  }

  return ipCount;
}

export async function clearFailedAttempts(userId: string): Promise<void> {
  await redis.del([failKey(userId), lockKey(userId)]);
  await redis.incr(generationKey(userId));
  await redis.expire(generationKey(userId), GENERATION_TTL_SECONDS);
}

// Require captcha only after the IP crosses the failure threshold.
const IP_FAIL_TRIGGER = 3;
const IP_FAIL_WINDOW = '15m';
const IP_CAPTCHA_DURATION = '30m';

// Hash the canonical login identifier with the observed IP. This avoids exposing
// emails/usernames in Redis keys and prevents shared proxies/NATs from making
// one user's failed attempts trigger a captcha for every other user.
const captchaScope = (ip: string, identifier: string) =>
  createHash('sha256').update(`${ip}\0${identifier}`).digest('hex');
const ipFailKey = (ip: string, identifier: string) =>
  `login:ipfail:v2:${captchaScope(ip, identifier)}`;
const ipCaptchaKey = (ip: string, identifier: string) =>
  `login:ipcaptcha:v2:${captchaScope(ip, identifier)}`;

export async function isCaptchaRequired(
  ip: string,
  identifier: string,
): Promise<boolean> {
  const flagged = await redis.get(ipCaptchaKey(ip, identifier));
  return flagged !== null;
}

export async function registerIpFailure(
  ip: string,
  identifier: string,
): Promise<void> {
  const count = await incrWithTtl(
    ipFailKey(ip, identifier),
    durationToSeconds(IP_FAIL_WINDOW),
  );
  if (count >= IP_FAIL_TRIGGER) {
    await redis.set(ipCaptchaKey(ip, identifier), '1', {
      EX: durationToSeconds(IP_CAPTCHA_DURATION),
    });
  }
}

// Successful login clears only this identifier's counter, not an active captcha.
export async function clearIpFailures(
  ip: string,
  identifier: string,
): Promise<void> {
  await redis.del(ipFailKey(ip, identifier));
}
