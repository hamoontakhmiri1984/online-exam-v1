const test = require('node:test');
const assert = require('node:assert/strict');
const { withApi } = require('./helpers/questionBankApi.cjs');

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
  assert.deepEqual((await (await request('Instructor:other', 'GET', '/')).json()).items, []);
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
