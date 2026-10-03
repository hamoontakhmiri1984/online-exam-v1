const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

async function api(t) {
  const posts = [];
  const prisma = {
    user: { findUnique: async () => ({ role: 'Instructor', approvalStatus: 'Approved' }) },
    blogPost: {
      findMany: async ({ where }) => posts.filter(p => !where || p.published === where.published),
      findUnique: async ({ where }) => posts.find(p => Object.entries(where).every(([k, v]) => p[k] === v)) ?? null,
      create: async ({ data }) => {
        const p = { id: `post-${posts.length + 1}`, coverImageKey: null, createdAt: new Date(), updatedAt: new Date(), author: { id: data.authorId, name: 'Admin' }, ...data };
        posts.push(p); return p;
      },
      update: async ({ where, data }) => Object.assign(posts.find(p => p.id === where.id), data),
      delete: async ({ where }) => posts.splice(posts.findIndex(p => p.id === where.id), 1)[0],
    },
  };
  const src = path.resolve(__dirname, '../src');
  const doubles = {
    'lib/prisma.ts': { prisma },
    'lib/jwt.ts': { verifyAccessToken: token => ({ role: token, sub: 'admin', sid: 'session' }) },
    'lib/session.ts': { isSessionValid: async () => true },
    'lib/storage.ts': { getPublicObjectUrl: key => `https://storage.example/${key}`, deletePublicObject: async () => {}, uploadPublicObject: async () => {} },
  };
  const cache = new Map();
  function load(filename) {
    const rel = path.relative(src, filename).split(path.sep).join('/');
    if (doubles[rel]) return doubles[rel];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, Buffer, TextDecoder, console, require: name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name) }, { filename });
    return module.exports;
  }
  const app = express(); app.use(express.json());
  app.use('/blog', load(path.join(src, 'routes/blog.ts')).default);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return (method, endpoint, body, role = 'SuperAdmin') => fetch(`http://127.0.0.1:${server.address().port}/blog${endpoint}`, { method, headers: { ...(role ? { Authorization: `Bearer ${role}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}
const input = { slug: 'first-post', title: 'عنوان فارسی', excerpt: 'خلاصه', contentMarkdown: 'متن مطلب', published: false };

test('HTTP blog: admin lists drafts, saves, edits, publishes and deletes a post', async t => {
  const request = await api(t);
  assert.equal((await request('GET', '/admin')).status, 200);
  const created = await request('POST', '/admin', input);
  assert.equal(created.status, 201);
  const post = await created.json();
  const listed = await request('GET', '/admin');
  assert.equal(listed.status, 200);
  assert.equal((await listed.json())[0].id, post.id);
  assert.equal((await request('GET', '/first-post', undefined, null)).status, 404);
  assert.equal((await request('GET', `/admin/${post.id}`)).status, 200);
  const updated = await request('PUT', `/admin/${post.id}`, { title: 'ویرایش', published: true });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).title, 'ویرایش');
  assert.equal((await request('GET', '/first-post', undefined, null)).status, 200);
  assert.equal((await request('DELETE', `/admin/${post.id}`)).status, 204);
  assert.deepEqual(await (await request('GET', '/admin')).json(), []);
});

test('HTTP blog: admin prefix is protected even when a published slug equals admin', async t => {
  const request = await api(t);
  assert.equal((await request('POST', '/admin', { ...input, slug: 'admin', published: true })).status, 201);
  assert.equal((await request('GET', '/admin', undefined, null)).status, 401);
  for (const role of ['Instructor', 'Student']) {
    assert.equal((await request('GET', '/admin', undefined, role)).status, 403);
    assert.equal((await request('POST', '/admin', input, role)).status, 403);
  }
  const response = await request('GET', '/admin');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(await response.json()));
});

test('HTTP blog: invalid input and duplicate slugs fail without creating extra posts', async t => {
  const request = await api(t);
  assert.equal((await request('POST', '/admin', { ...input, slug: '' })).status, 400);
  assert.equal((await request('POST', '/admin', input)).status, 201);
  assert.equal((await request('POST', '/admin', input)).status, 409);
  assert.equal((await (await request('GET', '/')).json()).length, 0);
});
