import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { Role } from '../src/api/authApi';
import {
  groupNavigationItems,
  navigationGroupLabel,
  navigationItems,
} from '../src/components/AppLayout/navigationItems';
import Card from '../src/components/Card/Card';
import PageHeader from '../src/components/PageHeader/PageHeader';
import StatCard from '../src/components/StatCard/StatCard';
import StatusBadge from '../src/components/StatusBadge/StatusBadge';

const forRole = (role: Role) =>
  navigationItems.filter((item) => item.roles.includes(role));

test('SuperAdmin menu is split into ordered groups under small headings', () => {
  const sections = groupNavigationItems(forRole('SuperAdmin'));
  assert.deepEqual(
    sections.map((s) => s.group),
    [undefined, 'users', 'content', 'finance', 'system']
  );
  assert.deepEqual(
    sections.map((s) => s.items.map((i) => i.to)),
    [
      ['/dashboard', '/exams'],
      ['/instructors', '/instructor-students', '/instructor-approvals', '/group-approvals'],
      ['/categories', '/site-content', '/blog-posts'],
      ['/subscriptions', '/payments', '/reports'],
      ['/admin-events', '/settings'],
    ]
  );
  assert.deepEqual(navigationGroupLabel, {
    users: 'کاربران',
    content: 'محتوا',
    finance: 'مالی',
    system: 'سیستم',
  });
});

test('Instructor and Student menus stay one flat section without headings', () => {
  for (const role of ['Instructor', 'Student'] as const) {
    const sections = groupNavigationItems(forRole(role));
    assert.equal(sections.length, 1);
    assert.equal(sections[0].group, undefined);
  }
});

test('every role sees each route at most once, and exactly one settings entry', () => {
  for (const role of ['SuperAdmin', 'Instructor', 'Student'] as const) {
    const paths = forRole(role).map((i) => i.to);
    assert.equal(new Set(paths).size, paths.length);
    assert.equal(paths.filter((p) => p === '/settings').length, 1);
  }
});

test('shared panel components render the expected markup', () => {
  const stat = renderToString(
    createElement(StatCard, { label: 'مدرس‌ها', value: 7, hint: '۳۰ روز اخیر' })
  );
  assert.match(stat, /مدرس‌ها/);
  assert.match(stat, /۷/);
  assert.match(stat, /۳۰ روز اخیر/);

  const header = renderToString(
    createElement(
      PageHeader,
      { title: 'مدرس‌ها', description: 'فهرست مدرس‌ها', actions: createElement('button', null, 'افزودن') }
    )
  );
  assert.match(header, /<h1[^>]*>مدرس‌ها<\/h1>/);
  assert.match(header, /فهرست مدرس‌ها/);
  assert.match(header, /افزودن/);

  const badge = renderToString(createElement(StatusBadge, { tone: 'success' }, 'فعال'));
  assert.match(badge, /فعال/);
  assert.match(badge, /rounded-full/);

  assert.match(renderToString(createElement(Card, null, 'x')), /p-6/);
  assert.doesNotMatch(
    renderToString(createElement(Card, { padded: false }, 'x')),
    /p-6/
  );
});
