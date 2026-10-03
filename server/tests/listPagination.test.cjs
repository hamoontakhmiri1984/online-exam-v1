const test = require('node:test');
const assert = require('node:assert/strict');
const { withApi } = require('./helpers/questionBankApi.cjs');

function storage(model) {
  const reads = [];
  const rows = Array.from({ length: 109 }, (_, index) => ({
    id: `id${String(index).padStart(3, '0')}`, name: `Name ${index}`, text: `Question ${index}`,
    category: 'General', instructorId: index < 107 ? 'owner' : 'other',
    bankId: index < 107 ? 'b1' : 'b2', createdAt: new Date('2026-01-01'),
    students: [{ id: index < 107 ? 'student' : 'outsider' }], joinCode: 'ABCDEF',
    _count: { questions: 500 }, options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'Easy',
  }));
  function filter(where) {
    return rows.filter(row => (!where.instructorId || where.instructorId === row.instructorId)
      && (!where.bankId || where.bankId === row.bankId)
      && (!where.students || row.students.some(s => s.id === where.students.some.id))
      && (!where.name || row.name.toLowerCase().includes(where.name.contains.toLowerCase()))
      && (!where.text || row.text.toLowerCase().includes(where.text.contains.toLowerCase())));
  }
  return { reads, adapter: {
    findUnique: async ({ where }) => where.id === 'b1' ? { ...rows[0], id: 'b1' } : null,
    findMany: async args => { reads.push({ operation: 'list', args }); return filter(args.where).slice(args.skip, args.skip + args.take); },
    count: async args => { reads.push({ operation: 'count', args }); return filter(args.where).length; },
  }, model };
}
const lists = [
  { model: 'group', endpoint: '/groups' },
  { model: 'questionBank', endpoint: '/' },
  { model: 'question', endpoint: '/b1/questions' },
];
for (const { model, endpoint } of lists) {
  test(`HTTP ${model}: bounded pages, scoped total, deterministic order and search`, async t => {
    const data = storage(model);
    await withApi(t, async request => {
      const first = await request('Instructor:owner', 'GET', endpoint);
      assert.equal(first.status, 200);
      const page1 = await first.json();
      assert.equal(page1.items.length, 25); assert.equal(page1.total, 107); assert.equal(page1.page, 1);
      const second = await (await request('Instructor:owner', 'GET', `${endpoint}?page=2&pageSize=25`)).json();
      assert.equal(second.items.length, 25); assert.equal(second.items[0].id, 'id025');
      assert.equal(second.total, 107); assert.equal(second.page, 2);
      const firstIds = new Set(page1.items.map(item => item.id));
      assert.ok(second.items.every(item => !firstIds.has(item.id)));
      const beyond = await (await request('Instructor:owner', 'GET', `${endpoint}?page=99`)).json();
      assert.equal(beyond.items.length, 0); assert.equal(beyond.total, 107);
      const search = await (await request('Instructor:owner', 'GET', `${endpoint}?q=106`)).json();
      assert.equal(search.total, 1); assert.equal(search.items[0].id, 'id106');
      for (let i = 0; i < data.reads.length; i += 2) {
        assert.deepEqual(data.reads[i].args.where, data.reads[i + 1].args.where, 'count uses the same access/search filter');
        assert.deepEqual(JSON.parse(JSON.stringify(data.reads[i].args.orderBy)), [{ createdAt: 'asc' }, { id: 'asc' }]);
        assert.ok(data.reads[i].args.take <= 100);
      }
      if (model === 'questionBank') assert.equal(page1.items[0].questionCount, 500, 'bank count is not this page length');
    }, { [model]: data.adapter });
  });
  test(`HTTP ${model}: rejects malformed and oversized pagination`, async t => {
    const data = storage(model);
    await withApi(t, async request => {
      for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=1000001', 'pageSize=101', 'pageSize=0', 'page=1&page=2', 'q=' + 'a'.repeat(201)]) {
        assert.equal((await request('Instructor:owner', 'GET', `${endpoint}?${query}`)).status, 400, query);
      }
      assert.equal(data.reads.length, 0, 'invalid query must not execute the list/count queries');
    }, { [model]: data.adapter });
  });
}
test('HTTP groups: Student pages and totals include only membership groups', async t => {
  const data = storage('group');
  await withApi(t, async request => {
    const res = await request('Student:student', 'GET', '/groups?pageSize=100&page=2');
    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.total, 107); assert.equal(result.items.length, 7);
    assert.ok(result.items.every(group => group.studentIds.includes('student')));
  }, { group: data.adapter });
});
