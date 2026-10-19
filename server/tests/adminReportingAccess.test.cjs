const test = require('node:test');
const assert = require('node:assert/strict');
const { withAdminApi } = require('./helpers/adminInstructorApi.cjs');
test('reporting routes enforce SuperAdmin through the real parent middleware', async t => {
  await withAdminApi(t, async request => {
    for (const path of ['/summary', '/attempts', '/payments', '/events']) {
      assert.equal((await request(path, '')).status, 401);
      for (const role of ['Student:student', 'Instructor:A']) assert.equal((await request(path, role)).status, 403);
    }
    for (const path of ['/summary?days=999', '/attempts?pageSize=101', '/payments?days[]=7', '/events?page=-1']) assert.equal((await request(path)).status, 400);
  }, '/admin/reporting');
});
