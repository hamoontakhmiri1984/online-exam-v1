const test = require('node:test');
const assert = require('node:assert/strict');
const { withAdminApi } = require('./helpers/adminInstructorApi.cjs');

const tabs = ['groups', 'students', 'lessons', 'handouts', 'attachments', 'banks', 'questions', 'exams', 'results'];
test('HTTP admin: list includes both teachers and profiles have the selected teacher identity', t => withAdminApi(t, async request => {
  const list = await (await request('?pageSize=1')).json();
  assert.equal(list.total, 2); assert.equal(list.items.length, 1);
  for (const id of ['A', 'B']) {
    const profile = await request(`/${id}`); assert.equal(profile.status, 200);
    assert.equal((await profile.json()).id, id);
  }
}));
for (const tab of tabs) {
  test(`HTTP admin ${tab}: A/B data and total are isolated`, t => withAdminApi(t, async request => {
    for (const id of ['A', 'B']) {
      const res = await request(`/${id}/${tab}?pageSize=1`); assert.equal(res.status, 200);
      const result = await res.json();
      assert.equal(result.total, 1); assert.equal(result.items.length, 1);
      const row = result.items[0];
      if (tab === 'students') assert.deepEqual(row.groups.map(group => group.id), [`g${id}`]);
      else assert.ok(row.id.endsWith(id), `${tab}: other teacher content leaked`);
      if (tab === 'exams') assert.deepEqual(row.groups.map(group => group.id), [`g${id}`]);
      const secondPage = await (await request(`/${id}/${tab}?pageSize=1&page=2`)).json();
      assert.equal(secondPage.total, 1); assert.equal(secondPage.items.length, 0);
    }
  }));
}
test('HTTP admin: foreign bank filter and search never include another teacher questions', t => withAdminApi(t, async request => {
  for (const query of ['bankId=bB', 'q=Question%20B']) {
    const result = await (await request(`/A/questions?${query}`)).json();
    assert.equal(result.total, 0); assert.deepEqual(result.items, []);
  }
  assert.equal((await (await request('/A/questions?bankId=bA')).json()).total, 1);
}));
test('HTTP admin: non-admin roles, anonymous, unknown and Student IDs are rejected', t => withAdminApi(t, async request => {
  for (const role of ['Student:student', 'Instructor:A', null]) {
    for (const endpoint of ['', '/A', ...tabs.map(tab => `/A/${tab}`)]) {
      assert.equal((await request(endpoint, role)).status, role ? 403 : 401);
    }
  }
  for (const id of ['unknown', 'student']) assert.equal((await request(`/${id}/questions`)).status, 404);
}));
test('HTTP admin: new content routes are read-only and reject invalid paging', t => withAdminApi(t, async request => {
  for (const tab of ['questions', 'attachments']) {
    assert.equal((await request(`/A/${tab}`, 'SuperAdmin:admin', 'POST')).status, 404);
    assert.equal((await request(`/A/${tab}?page=999999999999999999`)).status, 400);
  }
}));
