import assert from 'node:assert/strict';
import test from 'node:test';
import { groupNavigationItems, navigationItems } from '../src/components/AppLayout/navigationItems';
import {
  ensureNavigationGroupExpanded,
  getNavigationGroupForPath,
  readExpandedNavigationGroups,
  toggleNavigationGroup,
  writeExpandedNavigationGroups,
} from '../src/components/AppLayout/navigationState';

const adminSections = groupNavigationItems(
  navigationItems.filter((item) => item.roles.includes('SuperAdmin'))
);

test('active nested routes resolve to their containing admin navigation group', () => {
  assert.equal(getNavigationGroupForPath(adminSections, '/instructors'), 'education');
  assert.equal(getNavigationGroupForPath(adminSections, '/instructors/123'), 'education');
  assert.equal(getNavigationGroupForPath(adminSections, '/blog-posts/new'), 'content');
  assert.equal(getNavigationGroupForPath(adminSections, '/reports'), undefined);
  assert.equal(getNavigationGroupForPath(adminSections, '/unknown'), undefined);
});

test('admin navigation groups can be expanded and collapsed independently', () => {
  const opened = toggleNavigationGroup(['education'], 'content');
  assert.deepEqual(opened, ['education', 'content']);
  assert.deepEqual(toggleNavigationGroup(opened, 'education'), ['content']);
  assert.deepEqual(ensureNavigationGroupExpanded(['content'], 'content'), ['content']);
  assert.deepEqual(ensureNavigationGroupExpanded(['content'], 'finance'), ['content', 'finance']);
});

test('expanded navigation groups persist safely and discard unknown values', () => {
  const values = new Map<string, string>([
    ['admin-navigation:one', JSON.stringify(['education', 'content', 'unknown', 'content'])],
    ['admin-navigation:broken', '{invalid json'],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  assert.deepEqual(readExpandedNavigationGroups(storage, 'admin-navigation:one'), ['education', 'content']);
  assert.deepEqual(readExpandedNavigationGroups(storage, 'admin-navigation:new-account'), ['requests']);
  values.set('admin-navigation:all-closed', '[]');
  assert.deepEqual(readExpandedNavigationGroups(storage, 'admin-navigation:all-closed'), []);
  assert.deepEqual(readExpandedNavigationGroups(storage, 'admin-navigation:broken'), []);
  writeExpandedNavigationGroups(storage, 'admin-navigation:one', ['requests', 'finance']);
  assert.deepEqual(readExpandedNavigationGroups(storage, 'admin-navigation:one'), ['requests', 'finance']);
  assert.deepEqual(readExpandedNavigationGroups(null, 'admin-navigation:one'), []);
});
