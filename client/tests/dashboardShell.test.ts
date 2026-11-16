import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const layout = readFileSync('src/components/AppLayout/AppLayout.tsx', 'utf8');
const sidebar = readFileSync('src/components/AppLayout/SideBar.tsx', 'utf8');
const admin = readFileSync('src/pages/DashboardPage/admin/AdminDashboard.tsx', 'utf8');

test('dashboard shell is viewport-bound and cannot scroll as a whole', () => {
  assert.match(layout, /glass-app-shell[^\x60]*h-dvh overflow-hidden/);
  assert.match(layout, /flex h-full min-h-0 flex-col/);
  assert.match(layout, /flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden/);
});

test('active tab content owns the vertical scroll; header and tabs remain outside it', () => {
  assert.match(layout, /data-testid="panel-scroll-region"[^>]*overflow-y-auto/);
  const scrollRegion = layout.indexOf('data-testid="panel-scroll-region"');
  assert.ok(layout.indexOf('<Header') < scrollRegion);
  assert.ok(layout.indexOf('panel-internal-tabs') < scrollRegion);
  assert.ok(layout.indexOf('{children}') > scrollRegion);
});

test('sidebar is height constrained and navigation remains accessible on short screens', () => {
  assert.match(sidebar, /h-dvh w-72 min-h-0/);
  assert.match(sidebar, /sidebar-navigation[^"]*overflow-y-auto/);
  assert.match(sidebar, /flex shrink-0 items-center rounded-xl/);
});

test('dashboard local reload does not call browser-wide reload', () => {
  assert.match(admin, /onClick=\{\(\) => refetch\(\)\}/);
  assert.match(admin, /بارگذاری مجدد/);
  assert.doesNotMatch(admin, /location\.reload\(/);
});

test('unavailable session screen allows direct login instead of trapping users', () => {
  const screen = readFileSync('src/components/SessionStatus/SessionUnavailable.tsx', 'utf8');
  assert.match(screen, /to="\/login"/);
  assert.match(screen, /> تلاش مجدد\s*<\/button>/);
  assert.match(screen, /> ورود\s*<\/Link>/);
});
