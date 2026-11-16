import test from 'node:test';
import assert from 'node:assert/strict';
import { examClientHeaders } from '../src/api/examAttemptApi';

test('exam client identifier remains stable for the same exam and is isolated by exam', () => {
  const a = examClientHeaders('exam-a')['X-Exam-Client'];
  const repeated = examClientHeaders('exam-a')['X-Exam-Client'];
  const b = examClientHeaders('exam-b')['X-Exam-Client'];
  assert.equal(a, repeated);
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f-]{36}$/i);
});

test('the client ID is never an authentication token', () => {
  const headers = examClientHeaders('another-exam');
  assert.deepEqual(Object.keys(headers), ['X-Exam-Client']);
  assert.equal(typeof headers['X-Exam-Client'], 'string');
});
