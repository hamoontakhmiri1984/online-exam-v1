const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

// Exercise real Express routing, authentication/role guards, ownership checks,
// validation and handlers over HTTP. Only storage, JWT/session and quota IO are doubled.
function fixture() {
  let writes = 0;
  const bank = { id: 'b1', name: 'Bank', category: 'General', instructorId: 'owner', _count: { questions: 1 } };
  const question = { id: 'q1', bankId: 'b1', text: 'Question?', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'Easy' };
  const prisma = {
    user: { findUnique: async () => ({ role: 'Instructor', approvalStatus: 'Approved' }) },
    questionBank: {
      findUnique: async ({ where }) => where.id === bank.id ? bank : null,
      findMany: async ({ where }) => !where.instructorId || where.instructorId === bank.instructorId ? [bank] : [],
      create: async ({ data }) => { writes++; return { ...bank, ...data }; },
      update: async ({ data }) => { writes++; return { ...bank, ...data }; },
      delete: async () => { writes++; return bank; },
    },
    question: {
      findUnique: async ({ where }) => where.id === question.id ? question : where.id === 'foreign-question' ? { ...question, bankId: 'b2' } : null,
      findMany: async () => [question],
      create: async ({ data }) => { writes++; return { ...question, ...data }; },
      update: async ({ data }) => { writes++; return { ...question, ...data }; },
      delete: async () => { writes++; return question; },
    },
  };
  const src = path.resolve(__dirname, '../src');
  const cache = new Map();
  const doubles = {
    'lib/prisma.ts': { prisma },
    'lib/jwt.ts': { verifyAccessToken: token => {
      const [role, sub] = token.split(':');
      if (!['Student', 'Instructor', 'SuperAdmin'].includes(role) || !sub) throw new Error('invalid token');
      return { role, sub, sid: 'test-session' };
    } },
    'lib/session.ts': { isSessionValid: async () => true },
    'lib/quota.ts': { withQuotaForRole: async (_role, _sub, _kind, _count, run) => run(prisma) },
  };
  function load(filename) {
    const rel = path.relative(src, filename).split(path.sep).join('/');
    if (doubles[rel]) return doubles[rel];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, Buffer, TextDecoder, console,
      require: name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name),
    }, { filename });
    return module.exports;
  }
  const app = express(); app.use(express.json());
  app.use('/question-banks', load(path.join(src, 'routes/questionBanks.ts')).default);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }));
  return { app, writes: () => writes, question };
}
async function withApi(t, run) {
  const f = fixture(); const server = f.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  async function request(role, method, endpoint, body) {
    const headers = role ? { Authorization: `Bearer ${role}` } : {};
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(`http://127.0.0.1:${server.address().port}/question-banks${endpoint}`, {
      method, headers, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  }
  await run(request, f);
}
function csvForm() {
  const form = new FormData();
  form.append('file', new Blob(['text,o1,o2,o3,o4,o5,o6,correct,difficulty\nQuestion?,A,B,,,,,1,Easy\n'], { type: 'text/csv' }), 'questions.csv');
  return form;
}
const mutations = [
  ['POST', '/', { name: 'New bank', category: 'General' }],
  ['PUT', '/b1', { name: 'Renamed', category: 'General' }],
  ['DELETE', '/b1'],
  ['POST', '/b1/questions'],
  ['POST', '/b1/questions/bulk'],
  ['POST', '/b1/questions/import-excel'],
  ['PUT', '/b1/questions/q1'],
  ['DELETE', '/b1/questions/q1'],
];
test('HTTP: anonymous requests are rejected by the real auth middleware', t => withApi(t, async request => {
  assert.equal((await request(null, 'GET', '/')).status, 401);
}));
test('HTTP: SuperAdmin reads banks/questions but every mutation returns 403 without writes', t => withApi(t, async (request, f) => {
  for (const endpoint of ['/', '/b1', '/b1/questions']) {
    const res = await request('SuperAdmin:admin', 'GET', endpoint); assert.equal(res.status, 200, endpoint);
    assert.ok(await res.json());
  }
  for (const [method, endpoint, body] of mutations) {
    assert.equal((await request('SuperAdmin:admin', method, endpoint, body)).status, 403, `${method} ${endpoint}`);
  }
  assert.equal(f.writes(), 0);
}));
test('HTTP: Student cannot read or mutate any bank endpoint', t => withApi(t, async (request, f) => {
  for (const endpoint of ['/', '/b1', '/b1/questions']) assert.equal((await request('Student:s1', 'GET', endpoint)).status, 403);
  for (const [method, endpoint, body] of mutations) assert.equal((await request('Student:s1', method, endpoint, body)).status, 403);
  assert.equal(f.writes(), 0);
}));
test('HTTP: another Instructor cannot read or mutate the owner bank', t => withApi(t, async (request, f) => {
  assert.deepEqual(await (await request('Instructor:other', 'GET', '/')).json(), []);
  for (const endpoint of ['/b1', '/b1/questions']) assert.equal((await request('Instructor:other', 'GET', endpoint)).status, 403);
  for (const [method, endpoint, body] of mutations.slice(1).filter(([, p]) => !p.endsWith('import-excel'))) {
    const data = endpoint.endsWith('/bulk') ? [f.question] : body ?? f.question;
    assert.equal((await request('Instructor:other', method, endpoint, data)).status, 403, `${method} ${endpoint}`);
  }
  assert.equal((await request('Instructor:other', 'POST', '/b1/questions/import-excel', csvForm())).status, 403);
  assert.equal(f.writes(), 0);
}));
test('HTTP: owner reads and manages own bank and questions', t => withApi(t, async (request, f) => {
  for (const endpoint of ['/', '/b1', '/b1/questions']) assert.equal((await request('Instructor:owner', 'GET', endpoint)).status, 200);
  for (const [method, endpoint, body] of mutations.filter(([, p]) => !p.endsWith('import-excel'))) {
    const data = endpoint.endsWith('/bulk') ? [f.question] : body ?? f.question;
    const expected = method === 'DELETE' ? 204 : method === 'POST' ? 201 : 200;
    assert.equal((await request('Instructor:owner', method, endpoint, data)).status, expected, `${method} ${endpoint}`);
  }
  const imported = await request('Instructor:owner', 'POST', '/b1/questions/import-excel', csvForm());
  assert.equal(imported.status, 201);
  assert.equal((await imported.json()).created.length, 1);
  assert.equal(f.writes(), 8);
}));
test('HTTP: question ID belonging to another bank cannot bypass parent ownership', t => withApi(t, async (request, f) => {
  for (const method of ['PUT', 'DELETE']) assert.equal((await request('Instructor:owner', method, '/b1/questions/foreign-question', f.question)).status, 404);
  assert.equal(f.writes(), 0);
}));
