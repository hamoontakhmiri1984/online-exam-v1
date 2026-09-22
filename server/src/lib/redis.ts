import { createClient } from 'redis';
import { env } from '../config/env';

export const redis = createClient({
  url: env.REDIS_URL,
});

redis.on('error', (err) => console.error('Redis Client Error', err));

if (!redis.isOpen) {
  redis.connect();
}