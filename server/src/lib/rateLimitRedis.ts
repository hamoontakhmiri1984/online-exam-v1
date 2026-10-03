import { createClient } from 'redis';
import { env } from '../config/env';

// Dedicated connection: do not replay rate limit operations queued during an
// outage after the HTTP request has already returned a temporary failure.
export const rateLimitRedis = createClient({
  url: env.REDIS_URL,
  disableOfflineQueue: true,
  socket: { connectTimeout: 2_000 },
});
let reported = false;
rateLimitRedis.on('error', () => {
  if (!reported) console.error('Rate limit Redis unavailable');
  reported = true;
});
rateLimitRedis.on('ready', () => { reported = false; });
void rateLimitRedis.connect().catch(() => {
  console.error('Rate limit Redis connection failed');
});
