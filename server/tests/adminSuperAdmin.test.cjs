const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Unit tests with in-memory doubles for Prisma/Express; no DB, Redis or network.
const cache = new Map();
const plain = (x) => JSON.parse(JSON.stringify(x));
// Entry files are always executed fresh (they register routes on a new fake
// Router); only nested relative modules are cached.
function loadFile(file, mocks = {}, nested = false) {
  if (nested && cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  if (nested) cache.set(file, module.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, console, Promise, JSON, Number, Set, Map, Object, Array, String, RegExp, Error,
    require(name) {
      if (name in mocks) return mocks[name];
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(file), name);
        return loadFile(fs.existsSync(target + '.ts') ? target + '.ts' : path.join(target, 'index.ts'), mocks, true);
      }
      throw new Error(`Unmocked import: ${name}`);
    },
  }, { filename: file });
  return module.exports;
}
const src = (rel) => path.join(__dirname, '../src', rel);

// Fake express: Router() records registrations.
function fakeExpress() {
  const routers = [];
  function Router() {
    const r = { routes: [], uses: [] };
    for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
      r[m] = (p, ...h) => r.routes.push({ method: m, path: p, handlers: h });
    }
    r.use = (...args) => r.uses.push(args);
    routers.push(r);
    return r;
  }
  return { express: { Router }, routers };
}

// Runs an asyncHandler-wrapped handler and resolves with what it produced.
function invoke(handler, { query = {}, params = {}, user, body = {}, locals = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      locals,
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(b) { resolve({ status: this.statusCode, body: b }); },
      end() { resolve({ status: this.statusCode }); },
    };
    handler({ query, params, user, body }, res, (err) => resolve({ error: err }));
  });
}

test('parsePaging: defaults, bounds and invalid input', () => {
  const { parsePaging } = loadFile(src('lib/adminPaging.ts'), {});
  const d = parsePaging({});
  assert.deepEqual([d.page, d.pageSize, d.skip, d.take, d.q], [1, 20, 0, 20, undefined]);
  const p = parsePaging({ page: '3', pageSize: '10', q: '  علی ' });
  assert.deepEqual([p.skip, p.take, p.q], [20, 10, 'علی']);
  for (const bad of [{ page: '0' }, { page: '-1' }, { page: 'x' }, { pageSize: '101' }, { q: ['a'] }, { q: 'x'.repeat(101) }]) {
    assert.throws(() => parsePaging(bad), (e) => e.statusCode === 400, JSON.stringify(bad));
  }
});

test('/admin router is guarded by requireAuth + SuperAdmin role', async () => {
  const { express, routers } = fakeExpress();
  const jwt = { verifyAccessToken: () => ({}) };
  const requireAuthModule = loadFile(src('middleware/requireAuth.ts'), {
    '../lib/jwt': jwt,
    '../lib/session': { isSessionValid: async () => true },
    '../lib/prisma': { prisma: {} },
    '../lib/accountAccess': { instructorApprovalBlockMessage: () => null },
  });
  const stub = { default: { stub: true } };
  loadFile(src('routes/admin.ts'), {
    express,
    '../middleware/requireAuth': requireAuthModule,
    './admin/instructors.routes': stub,
    './admin/categories.routes': stub,
    './admin/users.routes': stub,
  });
  const admin = routers[routers.length - 1];
  const guards = admin.uses[0];
  assert.equal(guards.length, 2, 'first use() must install auth + role guard for every /admin route');
  const roleGuard = guards[1];
  for (const role of ['Instructor', 'Student', undefined]) {
    let statusCode; let nexted = false;
    roleGuard({ user: role ? { role } : undefined }, { status(c) { statusCode = c; return { json() {} }; } }, () => { nexted = true; });
    assert.equal(statusCode, 403, `role ${role} must be rejected`);
    assert.equal(nexted, false);
  }
  let nexted = false;
  roleGuard({ user: { role: 'SuperAdmin' } }, {}, () => { nexted = true; });
  assert.equal(nexted, true);
  assert.ok(admin.uses.some(([p]) => p === '/users'), '/users must be mounted under the guarded router');
});

function recordingPrisma(overrides = {}) {
  const calls = [];
  const model = (name) => new Proxy({}, {
    get: (_t, method) => async (args = {}) => {
      calls.push({ model: name, method, args });
      if (overrides[`${name}.${method}`]) return overrides[`${name}.${method}`](args);
      return method === 'count' ? 0 : method === 'findFirst' || method === 'findUniqueOrThrow' ? { id: 'T1' } : [];
    },
  });
  const prisma = new Proxy({}, { get: (_t, name) => model(name) });
  return { prisma, calls };
}

function loadDetail(prisma) {
  const { express, routers } = fakeExpress();
  loadFile(src('routes/admin/instructorDetail.routes.ts'), {
    express,
    '../../lib/prisma': { prisma },
    '../../lib/adminStats': {
      loadInstructorStats: async () => new Map(),
      loadCurrentPlans: async () => new Map(),
    },
  });
  return routers[routers.length - 1];
}

test('instructor detail: every tab query is scoped to that instructor', async () => {
  const { prisma, calls } = recordingPrisma();
  const router = loadDetail(prisma);
  const scoped = (w) => JSON.stringify(w).includes('"instructorId":"T1"');

  for (const p of ['/groups', '/students', '/lessons', '/handouts', '/banks', '/exams', '/results', '/billing']) {
    calls.length = 0;
    const route = router.routes.find((r) => r.path === p);
    assert.ok(route, `missing route ${p}`);
    const out = await invoke(route.handlers[0], { locals: { instructorId: 'T1' } });
    assert.equal(out.error, undefined, p);
    const reads = calls.filter((c) => c.args.where);
    assert.ok(reads.length >= 2, `${p} should query list + count`);
    for (const c of reads) assert.ok(scoped(c.args.where), `${p}: ${c.model}.${c.method} not scoped to instructor`);
  }
});

test('instructor detail: unknown or non-instructor id gives 404 and never reaches tab queries', async () => {
  const { prisma, calls } = recordingPrisma({ 'user.findFirst': () => null });
  const router = loadDetail(prisma);
  const guard = router.uses[0][0];
  const out = await invoke(guard, { params: { instructorId: 'student-1' } });
  assert.equal(out.error.statusCode, 404);
  assert.equal(calls[0].args.where.role, 'Instructor');
});

test('admin students list: ungrouped filter, instructor filter and conflicts', async () => {
  const { prisma, calls } = recordingPrisma();
  const { express, routers } = fakeExpress();
  loadFile(src('routes/admin/users.routes.ts'), {
    express,
    '../../lib/prisma': { prisma },
    '../../lib/adminStats': {},
    './instructorDetail.routes': { default: {} },
  });
  const users = routers[routers.length - 1];
  const list = users.routes.find((r) => r.path === '/students').handlers[0];

  await invoke(list, { query: { ungrouped: 'true' } });
  assert.equal(calls[0].args.where.role, 'Student');
  assert.deepEqual(plain(calls[0].args.where.groupsMember), { none: {} });

  calls.length = 0;
  await invoke(list, { query: { instructorId: 'T1' } });
  assert.deepEqual(plain(calls[0].args.where.groupsMember), { some: { instructorId: 'T1' } });

  const conflict = await invoke(list, { query: { instructorId: 'T1', ungrouped: 'true' } });
  assert.equal(conflict.error.statusCode, 400);
});

test('admin students list: instructors are derived from group membership, one entry per instructor', async () => {
  const rows = [{
    id: 's1', name: 'S', groupsMember: [
      { id: 'g1', name: 'A', category: 'c', instructor: { id: 'i1', name: 'I1' } },
      { id: 'g2', name: 'B', category: 'c', instructor: { id: 'i1', name: 'I1' } },
      { id: 'g3', name: 'C', category: 'c', instructor: { id: 'i2', name: 'I2' } },
    ],
  }];
  const { prisma } = recordingPrisma({ 'user.findMany': () => rows, 'user.count': () => 1 });
  const { express, routers } = fakeExpress();
  loadFile(src('routes/admin/users.routes.ts'), {
    express, '../../lib/prisma': { prisma }, '../../lib/adminStats': {}, './instructorDetail.routes': { default: {} },
  });
  const list = routers[routers.length - 1].routes.find((r) => r.path === '/students').handlers[0];
  const out = await invoke(list, {});
  const inst = out.body.items[0].instructors;
  assert.deepEqual(plain(inst.map((i) => [i.id, i.groups.length])), [['i1', 2], ['i2', 1]]);
  assert.equal(out.body.items[0].groupsMember, undefined);
});

function loadInstructorActions({ user, txCalls, revoked }) {
  const { express, routers } = fakeExpress();
  const tx = {
    user: { update: async ({ data }) => ({ ...user, ...data, createdAt: new Date() }) },
    adminAuditLog: { create: async (a) => { txCalls.push(a.data); } },
  };
  const prisma = {
    user: { findUnique: async () => user },
    $transaction: async (fn) => { txCalls.transactions = (txCalls.transactions || 0) + 1; return fn(tx); },
  };
  loadFile(src('routes/admin/instructors.routes.ts'), {
    express,
    '../../lib/prisma': { prisma },
    '../../lib/notifications': { notifyUser: async () => {} },
    '../../lib/session': { revokeSession: async (id) => { revoked.push(id); } },
    '../../realtime/socket': { forceLogoutOtherSessions() {} },
  });
  const r = routers[routers.length - 1];
  return (p) => r.routes.find((x) => x.method === 'post' && x.path === p).handlers[0];
}

test('approve/reject record admin, target and before/after in the same transaction', async () => {
  const txCalls = []; const revoked = [];
  const pending = { id: 'i1', role: 'Instructor', approvalStatus: 'Pending', name: 'N' };
  const get = loadInstructorActions({ user: pending, txCalls, revoked });

  await invoke(get('/:id/approve'), { params: { id: 'i1' }, user: { sub: 'admin1' } });
  assert.equal(txCalls.length, 1);
  assert.deepEqual(
    plain(txCalls[0]),
    { adminId: 'admin1', action: 'instructor.approve', targetType: 'User', targetId: 'i1', before: { approvalStatus: 'Pending' }, after: { approvalStatus: 'Approved' } }
  );

  await invoke(get('/:id/reject'), { params: { id: 'i1' }, user: { sub: 'admin1' } });
  assert.equal(txCalls.length, 2);
  assert.equal(txCalls[1].action, 'instructor.reject');
  assert.deepEqual(revoked, ['i1']);
});

test('repeated approve/reject is idempotent and writes no duplicate history', async () => {
  const txCalls = []; const revoked = [];
  const approved = loadInstructorActions({ user: { id: 'i1', role: 'Instructor', approvalStatus: 'Approved' }, txCalls, revoked });
  await invoke(approved('/:id/approve'), { params: { id: 'i1' }, user: { sub: 'admin1' } });
  assert.equal(txCalls.length, 0);

  const rejected = loadInstructorActions({ user: { id: 'i1', role: 'Instructor', approvalStatus: 'Rejected' }, txCalls, revoked });
  await invoke(rejected('/:id/reject'), { params: { id: 'i1' }, user: { sub: 'admin1' } });
  assert.equal(txCalls.length, 0);
  assert.deepEqual(revoked, ['i1'], 'session revoke must still run on retry');
});
