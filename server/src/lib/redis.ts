import { env } from '../config/env';
import { createManagedRedis } from './redisConnection';

export const redis = createManagedRedis(env.REDIS_URL, 'session');
