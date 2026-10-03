const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some(filter => matches(row, filter));
    if (value && typeof value === 'object') {
      if ('some' in value) return (row[key] || []).some(item => matches(item, value.some));
      if ('contains' in value) return String(row[key] || '').toLowerCase().includes(value.contains.toLowerCase());
      return matches(row[key] || {}, value);
    }
    return row[key] === value;
  });
}
function project(row, select) {
  if (!select) return row;
  return Object.fromEntries(Object.entries(select).filter(([, value]) => value).map(([key, value]) => {
    if (value === true) return [key, row[key]];
    const item = row[key];
    return [key, Array.isArray(item)
      ? item.filter(record => matches(record, value.where)).map(record => project(record, value.select))
      : item ? project(item, value.select) : null];
  }));
}
async function withAdminApi(t, run) {
  const teachers = ['A', 'B'].map(id => ({ id, role: 'Instructor', approvalStatus: 'Approved', name: `Teacher ${id}`, username: id }));
  const groups = teachers.map(teacher => ({ id: `g${teacher.id}`, instructorId: teacher.id, name: `Group ${teacher.id}` }));
  const banks = teachers.map(teacher => ({ id: `b${teacher.id}`, instructorId: teacher.id, name: `Bank ${teacher.id}` }));
  const rows = {};
  rows.user = [...teachers, { id: 'student', role: 'Student', name: 'Shared student', groupsMember: groups }];
  rows.group = groups;
  rows.questionBank = banks;
  rows.lessonSession = teachers.map((teacher, index) => ({ id: `l${teacher.id}`, title: `Lesson ${teacher.id}`, groups: [groups[index]], _count: { attachments: 1 } }));
  rows.handout = teachers.map((teacher, index) => ({ id: `h${teacher.id}`, instructorId: teacher.id, title: `Handout ${teacher.id}`, group: groups[index] }));
  rows.question = teachers.map((teacher, index) => ({ id: `q${teacher.id}`, bankId: banks[index].id, bank: banks[index], text: `Question ${teacher.id}`, options: ['one', 'two'], correctOptionIndex: 0 }));
  rows.exam = teachers.map(teacher => ({ id: `e${teacher.id}`, instructorId: teacher.id, title: `Exam ${teacher.id}`, groups }));
  rows.examAttempt = teachers.map((teacher, index) => ({ id: `r${teacher.id}`, exam: rows.exam[index], student: rows.user[2], correctCount: 1, totalQuestions: 2 }));
  rows.lessonAttachment = teachers.map((teacher, index) => ({ id: `a${teacher.id}`, fileName: `File ${teacher.id}`, session: rows.lessonSession[index], fileSize: 10 }));
  rows.adminAuditLog = [];
  const prisma = { $transaction: async operations => Promise.all(operations) };
  for (const [model, records] of Object.entries(rows)) {
    prisma[model] = {
      findMany: async ({ where, select, skip = 0, take = 100 }) => records.filter(row => matches(row, where)).slice(skip, skip + take).map(row => project(row, select)),
      findFirst: async ({ where, select }) => {
        const row = records.find(record => matches(record, where));
        return row ? project(row, select) : null;
      },
      findUnique: async ({ where }) => records.find(row => matches(row, where)),
      findUniqueOrThrow: async ({ where, select }) => project(records.find(row => matches(row, where)), select),
      count: async ({ where }) => records.filter(row => matches(row, where)).length,
      groupBy: async () => [{ approvalStatus: 'Approved', _count: { _all: 2 } }],
    };
  }
  const src = path.resolve(__dirname, '../../src');
  const cache = new Map();
  const doubles = {
    'lib/prisma.ts': { prisma },
    'lib/jwt.ts': { verifyAccessToken: token => {
      const [role, sub] = token.split(':');
      if (!role || !sub) throw new Error('invalid');
      return { role, sub, sid: 'test' };
    } },
    'lib/session.ts': { isSessionValid: async () => true },
    'lib/adminStats.ts': {
      loadInstructorStats: async ids => new Map(ids.map(id => [id, { groups: 1, students: 1, banks: 1, exams: 1, lessons: 1, handouts: 1 }])),
      loadCurrentPlans: async ids => new Map(ids.map(id => [id, { planId: 'free' }])),
    },
    'routes/admin/instructors.routes.ts': { __esModule: true, default: express.Router() },
    'routes/admin/categories.routes.ts': { __esModule: true, default: express.Router() },
  };
  function load(filename) {
    const relative = path.relative(src, filename).split(path.sep).join('/');
    if (doubles[relative]) return doubles[relative];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, console,
      require: name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name),
    }, { filename });
    return module.exports;
  }
  const app = express();
  app.use('/admin', load(path.join(src, 'routes/admin.ts')).default);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ error: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (endpoint, role = 'SuperAdmin:admin', method = 'GET') => fetch(
    `http://127.0.0.1:${server.address().port}/admin/users/instructors${endpoint}`,
    { method, headers: role ? { Authorization: `Bearer ${role}` } : {} },
  );
  await run(request);
}
module.exports = { withAdminApi };
