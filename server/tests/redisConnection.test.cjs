const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, project: path.resolve(__dirname, '../tsconfig.json') });
const { createClient } = require('redis');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { waitForRedis, redisHealth, redisTarget, createManagedRedis } = require('../src/lib/redisConnection');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function fake(ready, ping = async () => 'PONG') {
  const c = new EventEmitter(); c.isReady = ready; c.ping = ping; return c;
}
test('readiness waits for ready and a successful PING; cleans listeners', async () => {
  let called = 0; const c = fake(false, async () => { called++; return 'PONG'; });
  const pending = waitForRedis(c, 100);
  assert.equal(called, 0); c.isReady = true; c.emit('ready'); c.emit('ready');
  await pending; assert.equal(called, 1); assert.equal(c.listenerCount('ready'), 0);
});
test('readiness bounds unavailable, stalled, failed and malformed PING responses', async () => {
  for (const c of [fake(false), fake(true, () => new Promise(() => {})), fake(true, async () => { throw Error(); }), fake(true, async () => 'bad')]) {
    await assert.rejects(waitForRedis(c, 20)); assert.equal(c.listenerCount('ready'), 0);
  }
});
test('health does not enqueue a PING on disconnected clients and rejects bad replies', async () => {
  let count = 0; await assert.rejects(redisHealth(fake(false, async () => { count++; return 'PONG'; })));
  assert.equal(count, 0); await assert.rejects(redisHealth(fake(true, async () => 'bad')));
  assert.equal(await redisHealth(fake(true)), 'PONG');
});
test('diagnostic endpoint excludes Redis username/password/query and rejects HTTP URLs', () => {
  assert.equal(redisTarget('rediss://private:secret@example.com:6380/2?secret=xyz'), 'rediss://example.com:6380');
  assert.throws(() => redisTarget('https://example.com'));
});
test('real client on a closed port: bounded readiness, no offline writes, no credential log', async t => {
  const messages = [];
  t.mock.method(console, 'error', message => messages.push(message));
  t.mock.method(console, 'info', message => messages.push(message));
  const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r));
  const port = s.address().port; await new Promise(r => s.close(r));
  const before = messages.length;
  const c = createManagedRedis(`redis://private:secret@127.0.0.1:${port}`, 'test');
  try {
    await assert.rejects(waitForRedis(c, 600));
    await assert.rejects(c.set('must-not-replay', 'x'));
    assert.equal(c.options.disableOfflineQueue, true);
    assert.ok(messages.slice(before).filter(m => m.includes('unavailable')).length <= 1);
    assert.ok(!messages.slice(before).join('').includes('secret'));
  } finally { if (c.isOpen) c.destroy(); }
});
test('diagnostic CLI rejects a forwarded HTTPS Redis URL without leaking credentials', async () => {
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, [path.resolve(__dirname, '../scripts/check-redis.cjs')], { env: { ...process.env, REDIS_URL: 'https://private:secret@example.com' } });
    let text = ''; child.stdout.on('data', b => text += b); child.stderr.on('data', b => text += b);
    child.on('close', code => resolve({ code, text }));
  });
  assert.equal(result.code, 1); assert.match(result.text, /redis:\/\//); assert.ok(!result.text.includes('secret'));
});
// Opt-in real Redis test. Uses only unique test keys, never FLUSHDB.
test('Redis integration: both clients ready, outage fails closed, reconnect without replay', async t => {
  if (process.env.REQUIRE_SERVICES !== '1') return t.skip('Set REQUIRE_SERVICES=1 and REDIS_URL for a disposable Redis test service');
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const a = createManagedRedis(url, 'integration-session');
  const b = createManagedRedis(url, 'integration-rate');
  const admin = createClient({ url, socket: { reconnectStrategy: false, connectTimeout: 1000 } });
  admin.on('error', () => {});
  const key = `startup-test:${require('node:crypto').randomUUID()}`;
  try {
    await admin.connect(); await Promise.all([waitForRedis(a, 3000), waitForRedis(b, 3000)]);
    const id = await a.clientId();
    await admin.sendCommand(['CLIENT', 'KILL', 'ID', String(id)]);
    for (let i = 0; i < 100 && a.isReady; i++) await delay(1);
    assert.equal(a.isReady, false);
    await assert.rejects(a.set(key, 'must-not-replay'));
    await assert.rejects(redisHealth(a));
    await waitForRedis(a, 5000); assert.equal(await admin.get(key), null);
    assert.equal(await redisHealth(b), 'PONG');
  } finally { for (const c of [a, b, admin]) if (c.isOpen) c.destroy(); }
});
