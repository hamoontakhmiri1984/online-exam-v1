import test from 'node:test';
import assert from 'node:assert/strict';
import { isJoinCodeComplete, normalizeJoinCode } from '../src/pages/DashboardPage/joinCode';

test('join code is upper-cased and stripped of spaces and invisible marks', () => {
  assert.equal(normalizeJoinCode(' k7m 2qx\u200c'), 'K7M2QX');
});

test('Persian and Arabic-Indic digits become Latin digits', () => {
  assert.equal(normalizeJoinCode('۴۱۰۶۱۱'), '410611');
  assert.equal(normalizeJoinCode('٤١٠٦١١'), '410611');
});

test('join code length is capped at the server maximum', () => {
  assert.equal(normalizeJoinCode('a'.repeat(40)).length, 32);
});

test('a code counts as complete from the server minimum length', () => {
  assert.equal(isJoinCodeComplete('ABC'), false);
  assert.equal(isJoinCodeComplete('ABCD'), true);
});
