const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Unit test with in-memory doubles; no DB, Redis or network.
const src = (rel) => path.join(__dirname, '../src', rel);
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, console, Promise, JSON, Number, Set, Map, Date, Object, Array, String, Error,
    require(name) {
      if (name in mocks) return mocks[name];
      if (name.endsWith('asyncHandler')) return { asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next) };
      throw new Error(`Unmocked import: ${name}`);
    },
  }, { filename: file });
  return module.exports;
}

function setup(over = {}) {
  const calls = [];
  const routes = [];
  const Router = () => ({ get: (p, ...h) => routes.push({ path: p, handlers: h }) });
  const rec = (key, fn) => async (args) => { calls.push({ key, args }); return fn(args); };
  const t = (s) => new Date(s);
  const prisma = {
    user: {
      count: rec('user.count', ({ where }) =>
        where.role === 'Student' ? 7 : where.approvalStatus === 'Approved' ? 3 : 2),
      findMany: rec('user.findMany', () => [
        { id: 'i1', name: null, username: 'ali', email: 'a@x.com', phone: null, createdAt: t('2026-01-01T00:00:00Z') },
      ]),
    },
    group: {
      count: rec('group.count', () => 4),
      findMany: rec('group.findMany', () => [
        { id: 'g1', name: 'G', category: 'ریاضی', createdAt: t('2026-02-01T00:00:00Z'), instructor: { name: 'م', username: 'm' } },
      ]),
    },
    exam: {
      findMany: rec('exam.findMany', () => over.exams ?? [
        { id: 'e1', title: 'پیش‌نویس', scheduledAt: t('2999-01-01'), durationMinutes: 30, status: 'Draft', instructorId: 'i1', instructor: { name: null, username: 'ali', email: null } },
        { id: 'e2', title: 'پیش‌رو', scheduledAt: t('2999-01-01'), durationMinutes: 30, status: 'Published', instructorId: 'i1', instructor: { name: 'علی', username: null, email: null } },
        { id: 'e3', title: 'تمام', scheduledAt: t('2000-01-01'), durationMinutes: 30, status: 'Published', instructorId: 'i1', instructor: { name: 'علی', username: null, email: null } },
      ]),
    },
    examAttempt: {
      groupBy: rec('attempt.groupBy', () => [{ examId: 'e3', _count: { _all: 5 } }]),
    },
    $queryRaw: rec('raw', () => [{ count: 6 }]),
  };
  load(src('routes/admin/dashboard.routes.ts'), {
    express: { Router },
    '@prisma/client': { Prisma: { sql: (strings, ...values) => ({ strings, values }) } },
    '../../lib/prisma': { prisma },
  });
  return { handler: routes[0].handlers[0], calls, routes };
}

function run(handler) {
  return new Promise((resolve) => {
    handler({}, { json: resolve }, (err) => resolve({ error: err }));
  });
}

test('dashboard: one GET / route returning stats, attention queues and recent exams', async () => {
  const { handler, routes } = setup();
  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, '/');
  const body = await run(handler);
  assert.deepEqual(JSON.parse(JSON.stringify(body.stats)), {
    approvedInstructors: 3, students: 7, activeExams: 6, pendingRequests: 2 + 4,
  });
  assert.equal(body.attention.instructors.total, 2);
  assert.equal(body.attention.groups.total, 4);
  assert.equal(body.attention.instructors.items[0].name, 'ali');
  assert.equal(body.attention.groups.items[0].instructorName, 'م');
  assert.deepEqual(body.recentExams.map((e) => e.status), ['draft', 'upcoming', 'completed']);
  assert.deepEqual(body.recentExams.map((e) => e.participants), [0, 0, 5]);
  assert.equal(body.recentExams[0].instructorName, 'ali');
});

test('dashboard: queries are limited, ordered oldest-first, and read-only', async () => {
  const { handler, calls } = setup();
  await run(handler);
  const q = (key) => calls.filter((c) => c.key === key);
  const pendingInstructors = q('user.findMany')[0].args;
  assert.equal(pendingInstructors.take, 5);
  assert.equal(pendingInstructors.where.approvalStatus, 'Pending');
  assert.equal(pendingInstructors.where.role, 'Instructor');
  assert.equal(pendingInstructors.orderBy[0].createdAt, 'asc');
  assert.equal(q('group.findMany')[0].args.take, 5);
  assert.equal(q('group.findMany')[0].args.where.approvalStatus, 'Pending');
  assert.equal(q('exam.findMany')[0].args.take, 8);
  assert.equal(q('attempt.groupBy')[0].args.where.finishedAt, undefined, 'participants include started attempts');
  assert.ok(calls.every((c) => !/create|update|delete|upsert/i.test(c.key)));
});

test('dashboard: no recent exams skips the attempts query', async () => {
  const { handler, calls } = setup({ exams: [] });
  const body = await run(handler);
  assert.deepEqual(JSON.parse(JSON.stringify(body.recentExams)), []);
  assert.equal(calls.filter((c) => c.key === 'attempt.groupBy').length, 0);
});
