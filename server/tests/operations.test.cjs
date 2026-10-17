const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, project: path.resolve(__dirname, '../tsconfig.json') });
Object.assign(process.env, {
  DATABASE_URL: 'postgresql://test:test@localhost/test', REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), GOOGLE_CLIENT_ID: 'test', NODE_ENV: 'test',
});
const { createServer } = require('node:http');
const { listen, createShutdown, httpDrainer } = require('../src/lib/serverLifecycle');
const { periodicTask } = require('../src/lib/periodicTask');
const { logEvent } = require('../src/lib/logger');
const jwt = require('jsonwebtoken');
const tokens = require('../src/lib/jwt');
const delay = ms => new Promise(r => setTimeout(r, ms));

test('occupied HTTP port rejects with EADDRINUSE, not a Redis error', async () => {
  const first = createServer(); const second = createServer();
  await listen(first, 0);
  try { await assert.rejects(listen(second, first.address().port), { code: 'EADDRINUSE' }); }
  finally { await new Promise(r => first.close(r)); }
});
test('shutdown is idempotent and exits only after cleanup completes', async () => {
  let finish; let calls = 0; const codes = [];
  const stop = createShutdown(() => { calls++; return new Promise(r => { finish = r; }); }, code => codes.push(code), 100);
  const a = stop('SIGTERM'); const b = stop('SIGINT');
  assert.equal(a, b); await delay(5); assert.equal(calls, 1); assert.deepEqual(codes, []);
  finish(); await a; assert.deepEqual(codes, [0]);
});
test('shutdown bounds stuck cleanup and reports failed cleanup', async () => {
  const codes = [];
  createShutdown(() => new Promise(() => {}), code => codes.push(code), 10)('SIGTERM');
  await delay(30); assert.deepEqual(codes, [1]);
  await createShutdown(async () => { throw Error('cleanup failed'); }, code => codes.push(code))('SIGTERM');
  assert.deepEqual(codes, [1, 1]);
});
test('worker does not overlap and stop waits for active work', async () => {
  let finish; let calls = 0;
  const stop = periodicTask(() => { calls++; return new Promise(r => { finish = r; }); }, 5, assert.fail);
  await delay(25); assert.equal(calls, 1);
  let stopped = false; const pending = stop().then(() => { stopped = true; });
  await delay(10); assert.equal(stopped, false); finish(); await pending;
  await delay(15); assert.equal(calls, 1);
});
test('Socket.IO and HTTP drain together before shutdown exit', async () => {
  const { Server } = require('socket.io');
  let finish; let accepted;
  const started = new Promise(r => { accepted = r; });
  const server = createServer((_req, res) => { finish = () => res.end('ok'); accepted(); });
  const drainHttp = httpDrainer(server);
  const io = new Server(server); await listen(server, 0);
  const response = fetch(`http://localhost:${server.address().port}/`); await started;
  const codes = [];
  const stop = createShutdown(async () => {
    const drained = drainHttp();
    const sockets = new Promise(resolve => io.close(() => resolve()));
    await Promise.all([drained, sockets]);
  }, code => codes.push(code), 2000);
  const pending = stop('SIGTERM'); await delay(10); assert.deepEqual(codes, []);
  finish(); assert.equal(await (await response).text(), 'ok'); await pending; assert.deepEqual(codes, [0]);
});
test('structured startup log preserves cause and redacts URL credentials', t => {
  const lines = []; t.mock.method(console, 'error', line => lines.push(line));
  logEvent('error', 'startup_failed', Object.assign(Error('failed redis://name:secret@localhost:6379'), { code: 'EADDRINUSE' }));
  const result = JSON.parse(lines[0]); assert.equal(result.error.code, 'EADDRINUSE');
  assert.ok(!lines[0].includes('secret')); assert.ok(!lines[0].includes('name:'));
});
test('access and refresh tokens accept HS256 and reject HS384/HS512', () => {
  const access = { sub: 'user', sid: 'session', role: 'Student' };
  const refresh = { sub: 'user', sid: 'session', rememberMe: false };
  assert.equal(tokens.verifyAccessToken(tokens.signAccessToken(access)).sub, 'user');
  assert.equal(tokens.verifyRefreshToken(tokens.signRefreshToken(refresh)).sub, 'user');
  for (const algorithm of ['HS384', 'HS512']) {
    assert.throws(() => tokens.verifyAccessToken(jwt.sign(access, process.env.JWT_ACCESS_SECRET, { algorithm })));
    assert.throws(() => tokens.verifyRefreshToken(jwt.sign(refresh, process.env.JWT_REFRESH_SECRET, { algorithm })));
  }
});
