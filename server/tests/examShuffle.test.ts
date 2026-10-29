import test from 'node:test';
import assert from 'node:assert/strict';

import { getOptionOrder, shuffleExamQuestions } from '../src/lib/examShuffle';
import { calculateCorrectCount } from '../src/lib/attemptFinalize';

const questions = ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6'].map((id) => ({
  id,
}));

test(
  'question order is stable for an attempt and preserves every question',
  () => {
    const first = shuffleExamQuestions(questions, 'attempt-seed-a');

    assert.deepEqual(first, shuffleExamQuestions(questions, 'attempt-seed-a'));
    assert.deepEqual(
      first.map((question) => question.id).sort(),
      questions.map((question) => question.id).sort(),
    );
    assert.notDeepEqual(
      first.map((question) => question.id),
      shuffleExamQuestions(questions, 'attempt-seed-b').map(
        (question) => question.id,
      ),
    );
  },
);

test(
  'option order is a stable complete permutation per attempt and question',
  () => {
    const first = getOptionOrder(5, 'attempt-seed-a', 'q-1');

    assert.deepEqual(first, getOptionOrder(5, 'attempt-seed-a', 'q-1'));
    assert.deepEqual(
      [...first].sort((a, b) => a - b),
      [0, 1, 2, 3, 4],
    );
    assert.notDeepEqual(first, getOptionOrder(5, 'attempt-seed-b', 'q-1'));
    assert.notDeepEqual(first, getOptionOrder(5, 'attempt-seed-a', 'q-2'));
  },
);

test(
  'grading maps shuffled displayed option indices back to original indices',
  () => {
    const questionsWithAnswers = [
      {
        id: 'q-1',
        optionsSnapshot: ['a', 'b', 'c', 'd'],
        correctIndexSnapshot: 2,
      },
      {
        id: 'q-2',
        optionsSnapshot: ['a', 'b', 'c', 'd'],
        correctIndexSnapshot: 0,
      },
      {
        id: 'q-3',
        optionsSnapshot: ['a', 'b', 'c', 'd'],
        correctIndexSnapshot: 3,
      },
    ];

    for (const seed of [
      'attempt-seed-a',
      'attempt-seed-b',
      'attempt-seed-c',
    ]) {
      const answers = Object.fromEntries(
        questionsWithAnswers.map((question) => {
          const order = getOptionOrder(
            question.optionsSnapshot.length,
            seed,
            question.id,
          );
          return [question.id, order.indexOf(question.correctIndexSnapshot)];
        }),
      );

      assert.equal(
        calculateCorrectCount(questionsWithAnswers, answers, seed),
        questionsWithAnswers.length,
        `all correct answers should grade correctly with seed ${seed}`,
      );
    }
  },
);

test(
  'legacy attempts retain the original order',
  () => {
  assert.deepEqual(shuffleExamQuestions(questions, null), questions);
    assert.deepEqual(getOptionOrder(4, null, 'q-1'), [0, 1, 2, 3]);
  },
);
