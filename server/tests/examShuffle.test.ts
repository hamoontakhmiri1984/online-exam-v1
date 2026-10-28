import test from 'node:test';
import assert from 'node:assert/strict';
import {
  remapDisplayedAnswersForGrading,
  shuffledIndices,
  shuffleExamQuestions,
} from '../src/lib/examShuffle';

const questions = [
  {
    id: 'q1',
    optionsSnapshot: ['wrong', 'correct', 'other'],
    correctIndexSnapshot: 1,
  },
  {
    id: 'q2',
    optionsSnapshot: ['yes', 'no'],
    correctIndexSnapshot: 0,
  },
];

test('the same attempt seed creates stable question and option order', () => {
  const first = shuffleExamQuestions(questions, 'attempt-seed-1');
  const second = shuffleExamQuestions(questions, 'attempt-seed-1');
  assert.deepEqual(
    first.map((entry) => ({
      id: entry.question.id,
      options: entry.options,
      correct: entry.correctOptionIndex,
    })),
    second.map((entry) => ({
      id: entry.question.id,
      options: entry.options,
      correct: entry.correctOptionIndex,
    })),
  );
});

test(
  'displayed option selections remap to canonical indices for grading',
  () => {
    const seed = 'grade-seed';
    const shuffled = shuffleExamQuestions(questions, seed);
    const answers: Record<string, number> = {};
    for (const entry of shuffled) {
      // Pick the displayed index of the correct option for each question.
      answers[entry.question.id] = entry.correctOptionIndex;
    }
    const canonical = remapDisplayedAnswersForGrading(
      answers,
      questions,
      seed,
    );
    assert.equal(canonical.q1, 1);
    assert.equal(canonical.q2, 0);
  },
);

test(
  'legacy attempts without a shuffle seed keep their original answer indices',
  () => {
    const answers = { q1: 1, q2: 0 };
    assert.deepEqual(
      remapDisplayedAnswersForGrading(answers, questions, null),
      answers,
    );
  },
);

test('shuffle indices form a permutation and validate lengths', () => {
  const indices = shuffledIndices(20, 'permutation-seed', 'questions');
  assert.equal(indices.length, 20);
  assert.deepEqual(
    [...indices].sort((a, b) => a - b),
    Array.from({ length: 20 }, (_, i) => i),
  );
  assert.throws(() => shuffledIndices(-1, 'seed', 'test'), RangeError);
});
