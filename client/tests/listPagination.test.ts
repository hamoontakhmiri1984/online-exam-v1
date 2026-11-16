import test from 'node:test';
import assert from 'node:assert/strict';
import { collectListPages, listQueryString, type ListQuery } from '../src/lib/listPagination';
import { getGroups, getGroupsByInstructor, getGroupsByStudent } from '../src/api/groupApi';
import { getQuestionBanks, getBankQuestions } from '../src/api/questionBankApi';

test('selectors collect every page and deduplicate IDs across changing pages', async () => {
  const calls: ListQuery[] = [];
  const result = await collectListPages(async query => {
    calls.push(query);
    return { page: query.page!, pageSize: 100, total: 205,
      items: Array.from({ length: query.page === 3 ? 5 : 100 }, (_, i) => ({ id: String((query.page! - 1) * 100 + i) })) };
  });
  assert.equal(result.length, 205); assert.equal(result[204].id, '204');
  assert.deepEqual(calls.map(call => call.page), [1, 2, 3]);
  const duplicate = await collectListPages(async query => ({ page: query.page!, pageSize: 100, total: 101, items: [{ id: 'same' }] }));
  assert.equal(duplicate.length, 1);
});
test('later page errors and empty unfinished pages never silently return partial data', async () => {
  await assert.rejects(collectListPages(async query => {
    if (query.page === 2) throw new Error('offline');
    return { items: [{ id: 'first' }], total: 101, page: 1, pageSize: 100 };
  }), /offline/);
  await assert.rejects(collectListPages(async query => ({ items: [], total: 101, page: query.page!, pageSize: 100 })), /ناقص/);
});
test('query encodes search and page independently', () => {
  const params = new URLSearchParams(listQueryString({ page: 2, q: ' test & name ' }));
  assert.equal(params.get('q'), 'test & name'); assert.equal(params.get('page'), '2');
});
test('all group selectors and bank import APIs traverse later pages', async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async input => {
    const url = new URL(String(input)); urls.push(url.pathname + url.search);
    const page = Number(url.searchParams.get('page'));
    return new Response(JSON.stringify({ page, pageSize: 100, total: 101,
      items: page === 1 ? [{ id: 'first' }] : [{ id: 'last' }] }), { status: 200 });
  }) as typeof fetch;
  try {
    for (const load of [getGroups, () => getGroupsByInstructor('owner'), () => getGroupsByStudent('student'), getQuestionBanks, () => getBankQuestions('b1')]) {
      assert.deepEqual((await load()).map(item => item.id), ['first', 'last']);
    }
    assert.equal(urls.length, 10);
    assert.ok(urls.some(url => url.startsWith('/banks/b1/questions?') && url.includes('page=2')));
  } finally { globalThis.fetch = originalFetch; }
});

// Inspect actual rendered element tree; pagination controls live inside a toolbar.
type UiNode = { type?: unknown; props?: { children?: unknown; disabled?: boolean; onClick?: () => void; onChange?: (event: { target: { value: string } }) => void } };
function findNodes(node: unknown, type: string): UiNode[] {
  if (Array.isArray(node)) return node.flatMap(child => findNodes(child, type));
  if (!node || typeof node !== 'object') return [];
  const element = node as UiNode;
  return [
    ...(element.type === type ? [element] : []),
    ...findNodes(element.props?.children, type),
  ];
}

test('pagination controls show Persian totals and disable navigation at boundaries', async () => {
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { default: ListPagination } = await import('../src/components/ListPagination/ListPagination');
  const html = renderToString(createElement(ListPagination, {
    page: 2, pageSize: 25, total: 51, q: '', loading: false,
    setPage: () => {}, setSearch: () => {},
  }));
  assert.match(html, /۵۱/);
  assert.match(html, /صفحه‌بندی/);
  assert.match(html, /۲/);
  const tree = ListPagination({ page: 1, pageSize: 25, total: 26, loading: false, q: '', setPage: () => {}, setSearch: () => {} });
  const buttons = findNodes(tree, 'button');
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].props?.disabled, true);
  assert.equal(buttons[1].props?.disabled, false);
});
test('pagination actions request another page and forward the search text', async () => {
  const { default: ListPagination } = await import('../src/components/ListPagination/ListPagination');
  let page = 1; let q = '';
  const tree = ListPagination({ page: 1, pageSize: 25, total: 51, loading: false, q,
    setPage: value => { page = value; }, setSearch: value => { q = value; } });
  const buttons = findNodes(tree, 'button');
  buttons[1].props?.onClick?.(); assert.equal(page, 2);
  const input = findNodes(tree, 'input')[0];
  input.props?.onChange?.({ target: { value: 'Question 106' } }); assert.equal(q, 'Question 106');
});
