// Deterministic Fisher-Yates shuffles: an attempt's seed keeps order stable on reload.
function seedToUint32(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string): () => number {
  let state = seedToUint32(seed);
  return () => {
    let value = (state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledIndices(
  length: number,
  seed: string,
  purpose: string,
): number[] {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError('length must be a non-negative integer');
  }
  const indices = Array.from({ length }, (_, index) => index);
  const random = createRandom(`${seed}:${purpose}`);
  for (let index = indices.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indices[index], indices[swapIndex]] = [
      indices[swapIndex],
      indices[index],
    ];
  }
  return indices;
}

export type ShufflableExamQuestion = {
  id: string;
  optionsSnapshot: string[];
  correctIndexSnapshot: number;
};

export function shuffleExamQuestions<T extends ShufflableExamQuestion>(
  questions: T[],
  seed: string,
): Array<{ question: T; options: string[]; correctOptionIndex: number }> {
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
        options: optionOrder.map((optionIndex) => question.optionsSnapshot[optionIndex]),
        correctOptionIndex: optionOrder.indexOf(question.correctIndexSnapshot),
      };
    },
  );
}

// The browser stores answer indices in displayed (shuffled) order. Convert to the
// snapshotted order for grading, while leaving the stored answers review-friendly.
export function remapDisplayedAnswersForGrading(
  answers: Record<string, number>,
  questions: Array<Pick<ShufflableExamQuestion, 'id' | 'optionsSnapshot'>>,
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
