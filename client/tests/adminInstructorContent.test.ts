import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { getAdminInstructor, getAdminInstructors, getInstructorContent } from '../src/api/adminInstructorApi';
import InstructorContentList from '../src/pages/AdminInstructorsPage/components/InstructorContentList';
import { navigationItems } from '../src/components/AppLayout/navigationItems';
import { routes } from '../src/routes/routeConfig';

test('admin requests keep instructor, tab, page, search and bank filter scoped in the URL', async () => {
  const original = globalThis.fetch;
  const urls: URL[] = [];
  globalThis.fetch = (async input => {
    urls.push(new URL(String(input)));
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  try {
    await getAdminInstructors({ page: 2, q: 'Teacher A' }, 'Approved');
    await getAdminInstructor('A');
    await getInstructorContent('A', 'questions', { page: 2, q: 'question' }, 'bankA');
    await getInstructorContent('B', 'questions', { page: 1 });
    assert.equal(urls[0].searchParams.get('status'), 'Approved');
    assert.equal(urls[0].searchParams.get('q'), 'Teacher A');
    assert.equal(urls[1].pathname, '/admin/users/instructors/A');
    assert.equal(urls[2].pathname, '/admin/users/instructors/A/questions');
    assert.equal(urls[2].searchParams.get('page'), '2');
    assert.equal(urls[2].searchParams.get('bankId'), 'bankA');
    assert.equal(urls[3].pathname, '/admin/users/instructors/B/questions');
    assert.equal(urls[3].searchParams.has('bankId'), false);
  } finally { globalThis.fetch = original; }
});
test('scoped content renders question text, bank, options and the correct answer', () => {
  const html = renderToString(createElement(InstructorContentList, {
    tab: 'questions', onOpenBank: () => {},
    items: [{ id: 'qA', text: 'Question A', bank: { id: 'bA', name: 'Bank A' }, options: ['One', 'Two'], correctOptionIndex: 1 }],
  }));
  assert.match(html, /Question A/); assert.match(html, /Bank A/);
  assert.match(html, /Two/); assert.match(html, /پاسخ صحیح/); assert.doesNotMatch(html, /Question B/);
});
test('bank action preserves the selected bank identity', () => {
  let selected: unknown;
  const tree = InstructorContentList({ tab: 'banks', items: [{ id: 'bA', name: 'Bank A' }], onOpenBank: bank => { selected = bank; } });
  const article = tree.props.children[0];
  const button = article.props.children.find((child: { type?: string } | null) => child && child.type === 'button');
  button.props.onClick();
  assert.deepEqual(selected, { id: 'bA', name: 'Bank A' });
});
test('instructor directory and detail routes are protected for SuperAdmin only', () => {
  for (const path of ['/instructors', '/instructors/:instructorId']) {
    const route = routes.find(item => item.path === path);
    assert.equal(route?.protected, true); assert.deepEqual(route?.allowedRoles, ['SuperAdmin']);
  }
  const entry = navigationItems.find(item => item.to === '/instructors');
  assert.deepEqual(entry?.roles, ['SuperAdmin']);
  assert.equal(navigationItems.find(item => item.to === '/question-banks')?.adminLabel, 'همهٔ بانک‌های سوال');
});
