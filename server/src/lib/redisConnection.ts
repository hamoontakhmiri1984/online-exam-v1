import { logEvent } from './logger';
import { createClient } from 'redis';

// Do not log URLs with credentials or error messages supplied by a remote server.
export function redisTarget(raw: string) {
  const url = new URL(raw);
  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error('REDIS_URL must use redis:// or rediss://');
  }
  return `${url.protocol}//${url.hostname}:${url.port || '6379'}`;
}

export function createManagedRedis(url: string, label: string) {
  const target = redisTarget(url);
  const client = createClient({
    url,
    // A failed request must not execute later when Redis reconnects.
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: retries => Math.min(250 * 2 ** Math.min(retries, 5), 5_000) + Math.floor(Math.random() * 200),
    },
  });
  let unavailable = false;
  const report = () => {
    if (!unavailable) logEvent('error', `redis:${label}:unavailable:${target}`);
    unavailable = true;
  };
  client.on('error', report);
  client.on('ready', () => {
    logEvent('info', `redis:${label}:${unavailable ? 'reconnected' : 'ready'}:${target}`);
    unavailable = false;
  });
  // Handle rejection even if the caller shuts the connection down during startup.
  void client.connect().catch(report);
  return client;
}

interface ReadyClient {
  readonly isReady: boolean;
  on(event: 'ready', listener: () => void): unknown;
  removeListener(event: 'ready', listener: () => void): unknown;
  ping(): Promise<string>;
}

export function waitForRedis(client: ReadyClient, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    let started = false;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      client.removeListener('ready', ready);
      if (error) reject(error); else resolve();
    };
    const ready = () => {
      if (started) return;
      started = true;
      Promise.resolve().then(() => client.ping()).then(
        reply => finish(reply === 'PONG' ? undefined : new Error('Invalid Redis PING response')),
        () => finish(new Error('Redis PING failed')),
      );
    };
    const timer = setTimeout(() => finish(new Error('Redis readiness timeout')), timeoutMs);
    client.on('ready', ready);
    if (client.isReady) ready();
  });
}

export async function redisHealth(client: ReadyClient): Promise<string> {
  if (!client.isReady) throw new Error('Redis unavailable');
  const reply = await client.ping();
  if (reply !== 'PONG') throw new Error('Invalid Redis PING response');
  return reply;
}
