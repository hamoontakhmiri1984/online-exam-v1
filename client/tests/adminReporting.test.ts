import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import DataTable from '../src/components/AdminUI/DataTable';
import { routes } from '../src/routes/routeConfig';
import { getReportList, getReportSummary } from '../src/api/adminReportingApi';

test('management reports, finance and group reviews are restricted to SuperAdmin', () => {
  for (const path of ['/reports', '/subscriptions', '/payments', '/admin-events', '/group-approvals']) {
    const route = routes.find(route => route.path === path);
    assert.equal(route?.protected, true);
    assert.deepEqual(route?.allowedRoles, ['SuperAdmin']);
  }
});
test('report query keeps search, page, teacher and range scoped', async () => {
  const previous = globalThis.fetch; const urls: string[] = [];
  globalThis.fetch = async input => { urls.push(String(input)); return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  try {
    await getReportSummary(7, 'teacher&A');
    await getReportList('attempts', { page: 2, pageSize: 25, q: 'نام & آزمون' }, 90, 'oldest', 'teacher&A');
    const summary = new URL(urls[0]); assert.equal(summary.searchParams.get('instructorId'), 'teacher&A');
    const list = new URL(urls[1]);
    assert.equal(list.searchParams.get('page'), '2'); assert.equal(list.searchParams.get('days'), '90');
    assert.equal(list.searchParams.get('q'), 'نام & آزمون'); assert.equal(list.searchParams.get('order'), 'oldest');
    assert.equal(list.searchParams.get('instructorId'), 'teacher&A');
  } finally { globalThis.fetch = previous; }
});
test('table keeps an explicit empty state and accessible column headings', () => {
  const html = renderToString(createElement(DataTable, { items: [], columns: [{ key: 'name', label: 'مدرس', render: () => '' }] }));
  assert.match(html, /scope="col"/); assert.match(html, /موردی با این شرایط پیدا نشد/);
  const loading = renderToString(createElement(DataTable, { items: [], loading: true, columns: [] }));
  assert.match(loading, /aria-busy="true"/); assert.doesNotMatch(loading, /موردی با این شرایط پیدا نشد/);
});
