const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

// Exercise real Express routing, authentication/role guards, ownership checks,
// validation and handlers over HTTP. Only storage, JWT/session and quota IO are doubled.
function fixture(overrides = {}) {
  let writes = 0;
  const bank = { id: 'b1', name: 'Bank', category: 'General', instructorId: 'owner', _count: { questions: 1 } };
  const question = { id: 'q1', bankId: 'b1', text: 'Question?', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'Easy' };
  const prisma = {
    $transaction: async operations => Promise.all(operations),
    user: { findUnique: async () => ({ role: 'Instructor', approvalStatus: 'Approved' }) },
    questionBank: {
      count: async ({ where }) => !where.instructorId || where.instructorId === bank.instructorId ? 1 : 0,
      findUnique: async ({ where }) => where.id === bank.id ? bank : null,
      findMany: async ({ where }) => !where.instructorId || where.instructorId === bank.instructorId ? [bank] : [],
      create: async ({ data }) => { writes++; return { ...bank, ...data }; },
      update: async ({ data }) => { writes++; return { ...bank, ...data }; },
      delete: async () => { writes++; return bank; },
    },
    question: {
      count: async () => 1,
      findUnique: async ({ where }) => where.id === question.id ? question : where.id === 'foreign-question' ? { ...question, bankId: 'b2' } : null,
      findMany: async () => [question],
      create: async ({ data }) => { writes++; return { ...question, ...data }; },
      update: async ({ data }) => { writes++; return { ...question, ...data }; },
      delete: async () => { writes++; return question; },
    },
  };
  Object.assign(prisma, overrides);
  const src = path.resolve(__dirname, '../../src');
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
  app.use('/groups', load(path.join(src, 'middleware/requireAuth.ts')).requireAuth, load(path.join(src, 'routes/groups/groups.routes.ts')).default);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }));
  return { app, writes: () => writes, question };
}
async function withApi(t, run, overrides = {}) {
  const f = fixture(overrides); const server = f.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  async function request(role, method, endpoint, body) {
    const headers = role ? { Authorization: `Bearer ${role}` } : {};
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(`http://127.0.0.1:${server.address().port}${endpoint.startsWith('/groups') ? endpoint : `/question-banks${endpoint}`}`, {
      method, headers, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  }
  await run(request, f);
}

module.exports = { fixture, withApi };
