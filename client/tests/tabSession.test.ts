import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRestoreSessionOnLoad } from '../src/api/auth/auth.tabSession';

test('fresh public visit stays a guest even when the server has an old refresh cookie', () => {
  for (const path of ['/', '/blog', '/blog/example', '/login', '/signup', '/forgot-password']) {
    assert.equal(shouldRestoreSessionOnLoad(path, false), false, path);
  }
});

test('fresh protected page load still checks session for existing workspace refresh behavior', () => {
  assert.equal(shouldRestoreSessionOnLoad('/workspace', false), true);
  assert.equal(shouldRestoreSessionOnLoad('/dashboard', false), true);
  assert.equal(shouldRestoreSessionOnLoad('/settings', false), true);
});

test('an explicitly signed-in tab may restore its session after same-tab refresh', () => {
  assert.equal(shouldRestoreSessionOnLoad('/', true), true);
  assert.equal(shouldRestoreSessionOnLoad('/blog', true), true);
  assert.equal(shouldRestoreSessionOnLoad('/dashboard', true), true);
});
