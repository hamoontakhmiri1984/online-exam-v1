const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');
const rateLimit = require('express-rate-limit').default;
const { createClient } = require('redis');
const { randomUUID, createHash } = require('node:crypto');

function load(filename) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console, setTimeout, clearTimeout,
    require: name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name),
  }, { filename });
  return module.exports;
}
const { RedisRateLimitStore } = load(path.resolve(__dirname, '../src/lib/redisRateLimitStore.ts'));
function store(client, scope, windowMs = 10000, timeoutMs) {
  const s = new RedisRateLimitStore(client, scope, timeoutMs);
  s.init({ windowMs }); return s;
}
async function http(t, limiter) {
  const app = express(); app.use(limiter); app.get('/', (_req, res) => res.json({ ok: true }));
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return () => fetch(`http://127.0.0.1:${server.address().port}/`);
}

test('HTTP rate limit: disconnected Redis fails with 503 without sending a queued command', async t => {
  let commands = 0;
  const client = { isReady: false, sendCommand: async () => { commands++; } };
  const request = await http(t, rateLimit({ store: store(client, 'offline'), windowMs: 10000, max: 1 }));
  assert.equal((await request()).status, 503);
  assert.equal(commands, 0);
});

test('rate limit: stalled and malformed Redis replies fail with 503', async () => {
  const stalled = store({ isReady: true, sendCommand: () => new Promise(() => {}) }, 'slow', 10000, 20);
  await assert.rejects(stalled.increment('key'), err => err.statusCode === 503);
  for (const value of [null, [0, 10], [1, -1], ['bad', 10]]) {
    const malformed = store({ isReady: true, sendCommand: async () => value }, 'bad');
    await assert.rejects(malformed.increment('key'), err => err.statusCode === 503);
  }
});

test('rate limit: a failed successful-response refund never rejects the response listener', async () => {
  const s = store({ isReady: false, sendCommand: async () => {} }, 'refund');
  await assert.doesNotReject(s.decrement('key'));
});

test('Redis integration: shared atomic counters, independent scopes, expiry, refunds and HTTP 429', async t => {
  const options = { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379', disableOfflineQueue: true, socket: { reconnectStrategy: false, connectTimeout: 1500 } };
  const a = createClient(options), b = createClient(options);
  a.on('error', () => {}); b.on('error', () => {});
  const scope = `test-${randomUUID()}`;
  const key = name => `ratelimit:${name}:` + createHash('sha256').update('client').digest('hex');
  t.after(async () => {
    try {
      if (a.isReady) await a.del([key(scope), key(`${scope}-other`), key(`${scope}-expiry`), key(`${scope}-http`)]);
    } finally {
      if (a.isOpen) a.destroy(); if (b.isOpen) b.destroy();
    }
  });
  try { await Promise.all([a.connect(), b.connect()]); }
  catch {
    if (process.env.REQUIRE_SERVICES === '1') throw new Error('Redis required but unavailable');
    t.skip('Redis unavailable; run with REQUIRE_SERVICES=1 against a test Redis'); return;
  }
  const first = store(a, scope), second = store(b, scope);
  const results = await Promise.all(Array.from({ length: 40 }, (_, i) => (i % 2 ? first : second).increment('client')));
  assert.deepEqual(results.map(r => r.totalHits).sort((x, y) => x - y), Array.from({ length: 40 }, (_, i) => i + 1));
  const ttl = await a.pTTL(key(scope));
  await first.increment('client');
  assert.ok(await a.pTTL(key(scope)) <= ttl, 'increment must not extend expiry');
  assert.equal((await store(b, scope).increment('client')).totalHits, 42, 'a fresh store preserves the shared counter');
  assert.equal((await store(b, `${scope}-other`).increment('client')).totalHits, 1);
  await first.decrement('client');
  assert.equal(Number(await a.get(key(scope))), 41);
  await first.resetKey('client');
  await first.decrement('client');
  assert.equal(await a.exists(key(scope)), 0, 'refund must not create an immortal negative counter');
  const expires = store(a, `${scope}-expiry`, 40);
  await expires.increment('client');
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal((await expires.increment('client')).totalHits, 1);
  const request = await http(t, rateLimit({ store: store(a, `${scope}-http`), keyGenerator: () => 'client', windowMs: 10000, max: 1, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true }));
  assert.equal((await request()).status, 200);
  // The finish listener refunds the successful request asynchronously.
  for (let i = 0; i < 20 && Number(await a.get(key(`${scope}-http`))) > 0; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(Number(await a.get(key(`${scope}-http`))), 0);
  await store(b, `${scope}-http`).increment('client');
  const limited = await request();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});
