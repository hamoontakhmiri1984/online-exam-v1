const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

async function withApi(t, run) {
  const src = path.resolve(__dirname, '../src');
  const calls = [];
  const exam = { id: 'examA', instructorId: 'A', title: 'Exam A', category: 'General', scheduledAt: new Date('2030-01-01'), durationMinutes: 30, allowReview: true, status: 'Published', groups: [{ id: 'gA' }], _count: { attempts: 3 }, instructor: { id: 'A', name: null, username: 'teacherA' } };
  const blocked = () => { throw new Error('Unexpected write'); };
  const doubles = {
    'lib/prisma.ts': { prisma: {
      exam: { findMany: async args => { calls.push(args); return [exam]; }, create: blocked, update: blocked, delete: blocked },
      user: { findUnique: async ({ where }) => ({ role: where.id === 'A' ? 'Instructor' : where.id, approvalStatus: 'Approved' }) },
    } },
    'lib/jwt.ts': { verifyAccessToken: token => { const [role, sub] = token.split(':'); return { role, sub, sid: 'sid' }; } },
    'lib/session.ts': { isSessionValid: async () => true },
    'lib/quota.ts': {},
    'lib/examLock.ts': {},
  };
  const cache = new Map();
  function load(file) {
    const key = path.relative(src, file).split(path.sep).join('/');
    if (doubles[key]) return doubles[key];
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, console, Date, require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name) }, { filename: file });
    return module.exports;
  }
  const app = express(); app.use(express.json());
  app.use('/exams', load(path.join(src, 'routes/exams/exams.routes.ts')).default);
  app.use('/exams/:examId/questions', load(path.join(src, 'routes/questions.ts')).default);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const request = (role, url = '/exams', method = 'GET') => fetch(`http://127.0.0.1:${server.address().port}${url}`, { method, headers: role ? { Authorization: `Bearer ${role}:${role === 'Instructor' ? 'A' : role}` } : {} });
  await run(request, calls);
}
test('HTTP exam oversight: teacher identity is selected and exposed only to SuperAdmin', t => withApi(t, async (request, calls) => {
  for (const role of ['SuperAdmin', 'Instructor', 'Student']) {
    const response = await request(role); assert.equal(response.status, 200);
    const [exam] = await response.json();
    assert.equal(exam.participants, 3);
    assert.equal(Object.hasOwn(exam, 'instructor'), role === 'SuperAdmin');
    assert.equal(Object.hasOwn(calls.at(-1).include, 'instructor'), role === 'SuperAdmin');
    if (role === 'SuperAdmin') assert.deepEqual(exam.instructor, { id: 'A', name: null, username: 'teacherA' });
    if (role === 'Instructor') assert.equal(calls.at(-1).where.instructorId, 'A');
    if (role === 'Student') assert.equal(calls.at(-1).where.groups.some.students.some.id, 'Student');
  }
  assert.equal((await request(null)).status, 401);
}));
test('HTTP exam oversight: SuperAdmin cannot create, change, publish, delete or import questions', t => withApi(t, async request => {
  const paths = [['POST','/exams'],['PUT','/exams/e'],['DELETE','/exams/e'],['POST','/exams/e/publish'],['POST','/exams/e/unpublish'],['POST','/exams/e/questions'],['POST','/exams/e/questions/bulk'],['PUT','/exams/e/questions/q'],['DELETE','/exams/e/questions/q'],['POST','/exams/e/questions/from-bank']];
  for (const [method, url] of paths) assert.equal((await request('SuperAdmin', url, method)).status, 403, `${method} ${url}`);
}));
