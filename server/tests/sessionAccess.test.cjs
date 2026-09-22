const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Unit tests with explicit DB/Redis/token doubles; no external services required.
function load(relative, mocks = {}, globals = {}) {
  const filename = path.join(__dirname, '../src', relative);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (name in mocks) return mocks[name];
      throw new Error(`Unmocked import: ${name}`);
    },
    console: { error() {} }, ...globals,
  }, { filename });
  return module.exports;
}
const errors = load('lib/errors.ts');
const policy = load('lib/accountAccess.ts');
const payload = { sub: 'teacher', sid: 'session', role: 'Instructor', rememberMe: true };

function setup({ status = 'Approved', dbError, redisError, revokeError } = {}) {
  const calls = { rotate: 0, revoke: 0, disconnect: 0 };
  const prisma = { user: { findUnique: async () => {
    if (dbError) throw dbError;
    return { id: 'teacher', role: 'Instructor', approvalStatus: status };
  } } };
  const session = {
    isSessionValid: async () => { if (redisError) throw redisError; return true; },
    revokeSession: async () => { calls.revoke++; if (revokeError) throw revokeError; },
  };
  const jwt = { verifyAccessToken: () => payload, verifyRefreshToken: () => payload };
  const service = load('routes/auth/session.service.ts', {
    '../../lib/prisma': { prisma }, '../../lib/jwt': jwt,
    '../../lib/session': session, '../../lib/accountAccess': policy,
    '../../lib/errors': errors,
    '../../lib/authTokens': {
      getRefreshCookieName: () => 'refresh',
      issueRefreshedTokenPair: async () => {
        calls.rotate++;
        return { accessToken: 'access', refreshToken: 'refresh' };
      },
    },
    '../../realtime/socket': { forceLogoutOtherSessions: () => { calls.disconnect++; } },
  });
  const middleware = load('middleware/requireAuth.ts', {
    '../lib/prisma': { prisma }, '../lib/session': session,
    '../lib/jwt': jwt, '../lib/accountAccess': policy,
  });
  return { service, middleware, calls };
}

for (const status of ['Pending', 'Rejected']) {
  test(`${status}: refresh denied even when Redis revocation fails`, async () => {
    const { service, calls } = setup({ status, revokeError: new Error('Redis offline') });
    await assert.rejects(service.refreshUserSession('token'), e => e.statusCode === 401);
    assert.equal(calls.rotate, 0);
    assert.equal(calls.revoke, 1);
    assert.equal(calls.disconnect, 1);
  });
  test(`${status}: old access token cannot pass requireAuth`, async () => {
    const { middleware } = setup({ status });
    let responseStatus, nextCalled = false;
    const req = { headers: { authorization: 'Bearer token' } };
    const res = { status(value) { responseStatus = value; return this; }, json() {} };
    await middleware.requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(responseStatus, 401);
    assert.equal(nextCalled, false);
    assert.equal(req.user, undefined);
  });
}

test('Approved: refresh still succeeds', async () => {
  const { service, calls } = setup();
  const result = await service.refreshUserSession('token');
  assert.equal(result.accessToken, 'access');
  assert.equal(calls.rotate, 1);
  assert.equal(calls.revoke, 0);
});

for (const failure of ['dbError', 'redisError']) {
  test(`${failure}: infrastructure failure is not converted to 401`, async () => {
    const outage = new Error('temporarily unavailable');
    const { service, middleware } = setup({ [failure]: outage });
    await assert.rejects(service.refreshUserSession('token'), e => e === outage);
    let forwarded;
    await middleware.requireAuth(
      { headers: { authorization: 'Bearer token' } },
      { status() { throw new Error('unexpected HTTP auth error'); } },
      error => { forwarded = error; }
    );
    assert.equal(forwarded, outage);
  });
}

test('Reject retry retries revocation after partial failure', async () => {
  const routes = {};
  const router = { use() {}, get() {}, patch() {}, delete() {},
    post(route, handler) { routes[route] = handler; } };
  let user = { id: 'teacher', role: 'Instructor', approvalStatus: 'Approved',
    name: null, email: null, phone: null, username: null, createdAt: new Date() };
  let revocations = 0, updates = 0, disconnected = 0;
  load('routes/admin.ts', {
    express: { Router: () => router },
    '../lib/prisma': { prisma: { user: {
      findUnique: async () => user,
      update: async ({ data }) => { updates++; user = { ...user, ...data }; return user; },
    } } },
    '../middleware/requireAuth': { requireAuth() {}, requireRole() {} },
    '../lib/notifications': { notifyUser: async () => {} },
    '../lib/session': { revokeSession: async () => {
      revocations++;
      if (revocations === 1) throw new Error('Redis offline');
    } },
    '../realtime/socket': { forceLogoutOtherSessions: () => { disconnected++; } },
    '../lib/asyncHandler': { asyncHandler: fn => fn },
    '../lib/errors': errors, '../lib/categories': {}, '../validation/categorySchemas': {},
  });
  const handler = routes['/instructors/:id/reject'];
  const req = { params: { id: 'teacher' } };
  const res = { json() {} };
  await assert.rejects(handler(req, res), /Redis offline/);
  assert.equal(user.approvalStatus, 'Rejected');
  await handler(req, res);
  assert.equal(revocations, 2);
  assert.equal(updates, 1);
  assert.equal(disconnected, 1);
});

function setupSocket() {
  let server, sweep;
  class Server {
    sockets = { sockets: new Map(), adapter: { rooms: new Map() } };
    constructor() { server = this; }
    use(handler) { this.authenticate = handler; }
    on() {}
  }
  const api = load('realtime/socket.ts', {
    'socket.io': { Server },
    '../lib/jwt': { verifyAccessToken: () => payload },
    '../config/env': { env: { CLIENT_URL: 'http://localhost' } },
    '../lib/session': { isSessionValid: async () => true, getActiveSessionId: async () => 'sid' },
    '../lib/prisma': { prisma: { user: { findUnique: async () => ({
      role: 'Instructor', approvalStatus: 'Rejected',
    }) } } },
    '../lib/accountAccess': policy,
  }, { setInterval(fn) { sweep = fn; return { unref() {} }; } });
  api.initSocket({});
  return { server, sweep };
}

test('Rejected instructor cannot reconnect a socket with an old valid session', async () => {
  const { server } = setupSocket();
  let error;
  await server.authenticate({ handshake: { auth: { token: 'token' } }, data: {} }, e => { error = e; });
  assert.equal(error.message, 'session-expired');
});

test('Socket sweep disconnects rejected instructor even if Redis session remains', async () => {
  const { server, sweep } = setupSocket();
  let disconnected = false;
  server.sockets.sockets.set('socket', {
    data: { userId: 'teacher', role: 'Instructor' },
    emit() {}, disconnect() { disconnected = true; },
  });
  server.sockets.adapter.rooms.set('user:teacher', new Set(['socket']));
  await sweep();
  assert.equal(disconnected, true);
});
