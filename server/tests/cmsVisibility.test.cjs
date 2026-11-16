const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

async function fixture(t) {
  const store = new Map();
  const prisma = {
    user: {
      findUnique: async ({ where }) => ({
        role: where.id,
        approvalStatus: 'Approved',
      }),
    },
    siteContent: {
      findMany: async () =>
        [...store].map(([section, value]) => ({ section, data: value })),
      upsert: async ({ where, create, update }) => {
        const key = where.section;
        const data = store.has(key) ? update.data : create.data;
        store.set(key, data);
        return { section: key, data };
      },
      deleteMany: async ({ where }) => {
        const count = store.delete(where.section) ? 1 : 0;
        return { count };
      },
    },
    $transaction: async (calls) => Promise.all(calls),
  };
  const src = path.resolve(__dirname, '../src');
  const doubles = {
    'lib/prisma.ts': { prisma },
    'lib/jwt.ts': {
      verifyAccessToken: (token) => ({
        role: token,
        sub: token,
        sid: 'session',
      }),
    },
    'lib/session.ts': { isSessionValid: async () => true },
    'lib/storage.ts': {
      uploadPublicObject: async () => {},
      getPublicObjectUrl: (key) => key,
    },
  };
  const cache = new Map();
  function load(filename) {
    const rel = path.relative(src, filename).split(path.sep).join('/');
    if (doubles[rel]) return doubles[rel];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(
      code,
      {
        module,
        exports: module.exports,
        Buffer,
        TextDecoder,
        console,
        require: (name) =>
          name.startsWith('.')
            ? load(path.resolve(path.dirname(filename), name + '.ts'))
            : require(name),
      },
      { filename },
    );
    return module.exports;
  }

  const app = express();
  app.use(express.json());
  app.use('/cms', load(path.join(src, 'routes/cms.ts')).default);
  app.use((err, _req, res, _next) =>
    res.status(err.statusCode || 500).json({ error: err.message }),
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const request = (method, uri, body, role = 'SuperAdmin') =>
    fetch('http://127.0.0.1:' + server.address().port + '/cms' + uri, {
      method,
      headers: {
        ...(role ? { Authorization: 'Bearer ' + role } : {}),
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { store, request };
}

test('CMS: publish and unpublish one section without deleting the saved content', async (t) => {
  const { request, store } = await fixture(t);
  assert.equal(
    (
      await request('PUT', '/admin/hero', {
        data: { title: 'بنر اول' },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request('PUT', '/admin/about', {
        data: { title: 'درباره' },
      })
    ).status,
    200,
  );
  assert.equal((await request('POST', '/admin/publish/hero')).status, 200);
  assert.equal(store.has('about'), false);
  let publicPage = await (await request('GET', '/', undefined, null)).json();
  assert.equal(publicPage.sections.hero.title, 'بنر اول');
  assert.deepEqual(publicPage.hiddenSections, []);
  assert.equal((await request('POST', '/admin/unpublish/hero')).status, 200);
  publicPage = await (await request('GET', '/', undefined, null)).json();
  assert.deepEqual(publicPage.sections.hero, {});
  assert.deepEqual(publicPage.hiddenSections, ['hero']);
  assert.equal(
    (await (await request('GET', '/admin/drafts')).json()).sections.hero.title,
    'بنر اول',
  );
  assert.equal((await request('POST', '/admin/publish/hero')).status, 200);
  assert.deepEqual(
    (await (await request('GET', '/', undefined, null)).json()).hiddenSections,
    [],
  );
});

test('CMS: only SuperAdmin may change section visibility and section names are validated', async (t) => {
  const { request } = await fixture(t);
  for (const role of ['Student', 'Instructor']) {
    assert.equal(
      (await request('POST', '/admin/unpublish/hero', undefined, role)).status,
      403,
    );
  }
  assert.equal((await request('POST', '/admin/unpublish/nope')).status, 400);
});
