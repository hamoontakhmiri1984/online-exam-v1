import test from 'node:test';
import assert from 'node:assert/strict';
import { userDisplayName } from '../src/lib/userDisplayName';

test('unnamed users have an identity and are not labelled deleted', () => {
  assert.equal(userDisplayName({ name: null, username: '09123456789' }), '09123456789');
  assert.equal(userDisplayName({ name: '  ', username: '', email: 'user@example.com' }), 'user@example.com');
  assert.equal(userDisplayName({ name: ' علی ', username: 'username' }), 'علی');
  assert.equal(userDisplayName({ name: null }), 'بدون نام');
  assert.equal(userDisplayName(undefined), 'کاربر در دسترس نیست');
});
