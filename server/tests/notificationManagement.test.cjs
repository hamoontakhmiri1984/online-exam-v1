const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');
function fixture() {
  const notifications = [
    { id: 'privateA', userId: 'A', targetRoles: [], title: 'Private A' },
    { id: 'privateB', userId: 'B', targetRoles: [], title: 'Private B' },
    { id: 'shared', userId: null, targetRoles: ['Student'], title: 'Shared' },
  ].map(n => ({ ...n, read: false, icon: 'info', createdAt: new Date() }));
  const reads = new Map();
  let failCreate = false;
  const visible = (n, where) => where.OR.some(rule => rule.userId === n.userId && (!rule.targetRoles || n.targetRoles.includes(rule.targetRoles.has)));
  const prisma = {
    user: { findUnique: async () => ({ role: 'Student', approvalStatus: 'Approved' }) },
    notification: {
      findMany: async ({ where }) => notifications.filter(n => visible(n, where) && !reads.get(`${where.reads.none.userId}:${n.id}`)?.dismissedAt),
      findFirst: async ({ where }) => notifications.find(n => n.id === where.id && visible(n, where)) || null,
      findUnique: async ({ where }) => notifications.find(n => n.id === where.id),
      create: async ({ data }) => { if (failCreate) throw Error('offline'); const row = { id: 'login', targetRoles: [], createdAt: new Date(), ...data }; notifications.push(row); return row; },
    },
    notificationRead: {
      findMany: async ({ where }) => [...reads.values()].filter(r => r.userId === where.userId && where.notificationId.in.includes(r.notificationId)),
      upsert: async ({ where, create, update }) => { const { userId, notificationId } = where.userId_notificationId; const key = `${userId}:${notificationId}`; const row = reads.has(key) ? { ...reads.get(key), ...update } : create; reads.set(key, row); return row; },
    },
  };
  const root = path.resolve(__dirname, '../src');
  const cache = new Map();
  const mocks = {
    'lib/prisma.ts': { prisma },
    'lib/jwt.ts': { verifyAccessToken: token => ({ sub: token, role: 'Student', sid: 'test' }) },
    'lib/session.ts': { isSessionValid: async () => true },
    'realtime/socket.ts': { getIo: () => { throw Error('no live socket'); } },
    'lib/logger.ts': { logEvent() {} },
  };
  function load(file) {
    const relative = path.relative(root, file);
    if (mocks[relative]) return mocks[relative];
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, Date, console, require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name) }, { filename: file });
    return module.exports;
  }
  return { load: relative => load(path.join(root, relative)), notifications, setFail: () => { failCreate = true; } };
}
test('HTTP notifications: personal and broadcast dismissal is private, persistent, idempotent and ownership checked', async t => {
  const f = fixture(); const app = express();
  app.use('/notifications', f.load('routes/notifications.ts').default);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const request = (user, suffix = '', method = 'GET') => fetch(`http://127.0.0.1:${server.address().port}/notifications${suffix}`, { method, headers: user ? { Authorization: `Bearer ${user}` } : {} });
  assert.equal((await request(null, '/shared', 'DELETE')).status, 401);
  assert.equal((await request('A', '/privateB', 'DELETE')).status, 404);
  for (const id of ['privateA', 'shared']) {
    assert.equal((await request('A', `/${id}`, 'DELETE')).status, 204);
    assert.equal((await request('A', `/${id}`, 'DELETE')).status, 204);
  }
  assert.deepEqual(await (await request('A')).json(), []);
  const other = await (await request('B')).json();
  assert.deepEqual(other.map(n => n.id), ['privateB', 'shared']);
  assert.equal(other.find(n => n.id === 'shared').read, false);
  assert.equal((await request('A', '/shared/read', 'POST')).status, 200);
  assert.deepEqual(await (await request('A')).json(), []);
});
test('login notifications normalize valid IPs, stay personal and do not fail login when storage fails', async () => {
  const f = fixture(); const { notifyLogin, loginNotificationTitle } = f.load('lib/loginNotification.ts');
  assert.match(loginNotificationTitle('::ffff:203.0.113.10'), /IP اتصال: 203\.0\.113\.10/);
  assert.match(loginNotificationTitle('2001:db8::1'), /2001:db8::1/);
  assert.match(loginNotificationTitle('forged, 203.0.113.10'), /نامشخص/);
  await notifyLogin('A', '203.0.113.10');
  const login = f.notifications.at(-1); assert.equal(login.userId, 'A'); assert.equal(login.targetRoles.length, 0);
  f.setFail(); await assert.doesNotReject(notifyLogin('B', '127.0.0.1'));
});
