import { createHash } from 'node:crypto';
import type { Options, Store } from 'express-rate-limit';
import { AppError } from './errors';

export interface RateLimitRedisClient {
  readonly isReady: boolean;
  sendCommand(args: string[]): Promise<unknown>;
}

// Increment and expiry must be one operation, including concurrent requests
// from separate server processes. Subsequent requests never extend the window.
const INCREMENT = `
local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {hits, ttl}
`;
const DECREMENT = `
local hits = tonumber(redis.call('GET', KEYS[1]) or '0')
if hits > 0 then return redis.call('DECR', KEYS[1]) end
return 0
`;

export class RedisRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;
  private windowMs = 0;

  constructor(
    private readonly client: RateLimitRedisClient,
    scope: string,
    private readonly timeoutMs = 2_000
  ) {
    this.prefix = `ratelimit:${scope}:`;
  }

  init(options: Options) { this.windowMs = options.windowMs; }

  private key(identifier: string) {
    // Avoid storing email, phone and unbounded request bodies as Redis keys.
    return this.prefix + createHash('sha256').update(identifier).digest('hex');
  }

  private async command(args: string[]): Promise<unknown> {
    let timer: NodeJS.Timeout | undefined;
    try {
      if (!this.client.isReady) throw new Error('Redis unavailable');
      return await Promise.race([
        this.client.sendCommand(args),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Redis timeout')), this.timeoutMs);
        }),
      ]);
    } catch {
      throw new AppError(503, 'سرویس کنترل درخواست‌ها موقتاً در دسترس نیست؛ دوباره تلاش کنید');
    } finally {
      clearTimeout(timer);
    }
  }

  async increment(identifier: string) {
    const result = await this.command([
      'EVAL', INCREMENT, '1', this.key(identifier), String(this.windowMs),
    ]);
    if (!Array.isArray(result) || result.length !== 2) {
      throw new AppError(503, 'پاسخ سرویس کنترل درخواست‌ها نامعتبر است');
    }
    const [totalHits, ttl] = result.map(Number);
    if (!Number.isSafeInteger(totalHits) || totalHits < 1 || !Number.isFinite(ttl) || ttl < 0) {
      throw new AppError(503, 'پاسخ سرویس کنترل درخواست‌ها نامعتبر است');
    }
    return { totalHits, resetTime: new Date(Date.now() + ttl) };
  }

  async decrement(identifier: string) {
    // express-rate-limit invokes this after the HTTP response has finished.
    // A failed refund conservatively keeps the hit; never reject that listener.
    try {
      await this.command(['EVAL', DECREMENT, '1', this.key(identifier)]);
    } catch {
      console.error('Rate limit refund unavailable');
    }
  }

  async resetKey(identifier: string) {
    await this.command(['DEL', this.key(identifier)]);
  }
}
