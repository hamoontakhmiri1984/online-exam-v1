import { createHash } from 'node:crypto';

// A cryptographic hash gives each index a stable, seed-specific ordering without
// reducing the UUID seed to a small PRNG state.
export function shuffledIndices(
  length: number,
  seed: string,
  purpose: string,
): number[] {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError('length must be a non-negative integer');
  }

  return Array.from({ length }, (_, index) => ({
    index,
    key: createHash('sha256')
      .update(`${seed}:${purpose}:${index}`)
      .digest('hex'),
  }))
    .sort((left, right) => {
      if (left.key !== right.key) return left.key < right.key ? -1 : 1;
      return left.index - right.index;
    })
    .map(({ index }) => index);
}

export type ShufflableExamQuestion = {
  id: string;
  optionsSnapshot: string[];
  correctIndexSnapshot: number;
};

export function shuffleExamQuestions<T extends ShufflableExamQuestion>(
  questions: T[],
  seed: string,
): Array<{
  question: T;
  options: string[];
  correctOptionIndex: number;
}> {
  return shuffledIndices(questions.length, seed, 'questions').map(
    (questionIndex) => {
      const question = questions[questionIndex];
      const optionOrder = shuffledIndices(
        question.optionsSnapshot.length,
        seed,
        `options:${question.id}`,
      );
      return {
        question,
        options: optionOrder.map(
          (optionIndex) => question.optionsSnapshot[optionIndex],
        ),
        correctOptionIndex: optionOrder.indexOf(
          question.correctIndexSnapshot,
        ),
      };
    },
  );
}

// The browser stores answer indices in displayed (shuffled) order. Convert to the
// snapshotted order for grading, while leaving the stored answers review-friendly.
export function remapDisplayedAnswersForGrading(
  answers: Record<string, number>,
  questions: Array<
    Pick<ShufflableExamQuestion, 'id' | 'optionsSnapshot'>
  >,
  seed: string | null | undefined,
): Record<string, number> {
  if (!seed) return { ...answers };
  const result = { ...answers };
  for (const question of questions) {
    const displayedIndex = answers[question.id];
    if (displayedIndex === undefined) continue;
    const optionOrder = shuffledIndices(
      question.optionsSnapshot.length,
      seed,
      `options:${question.id}`,
    );
    const originalIndex = optionOrder[displayedIndex];
    if (originalIndex === undefined) delete result[question.id];
    else result[question.id] = originalIndex;
  }
  return result;
}
