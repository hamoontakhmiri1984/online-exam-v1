import test from 'node:test';
import assert from 'node:assert/strict';

import { getOptionOrder, shuffleExamQuestions } from '../src/lib/examShuffle';

const questions = ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6'].map((id) => ({
  id,
}));

test(
  'question order is stable for an attempt and preserves every question',
  () => {
  const first = shuffleExamQuestions(questions, 'attempt-seed-a');
  assert.deepEqual(first, shuffleExamQuestions(questions, 'attempt-seed-a'));
  assert.deepEqual(
    first.map((q) => q.id).sort(),
    questions.map((q) => q.id).sort(),
  );
  assert.notDeepEqual(
    first.map((q) => q.id),
    shuffleExamQuestions(questions, 'attempt-seed-b').map((q) => q.id),
  );
});

test(
  'option order is a stable complete permutation per attempt and question',
  () => {
  const first = getOptionOrder(5, 'attempt-seed-a', 'q-1');
  assert.deepEqual(first, getOptionOrder(5, 'attempt-seed-a', 'q-1'));
  assert.deepEqual([...first].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  assert.notDeepEqual(first, getOptionOrder(5, 'attempt-seed-b', 'q-1'));
  assert.notDeepEqual(first, getOptionOrder(5, 'attempt-seed-a', 'q-2'));
});

test('legacy attempts retain the original order', () => {
  assert.deepEqual(shuffleExamQuestions(questions, null), questions);
  assert.deepEqual(getOptionOrder(4, null, 'q-1'), [0, 1, 2, 3]);
});
