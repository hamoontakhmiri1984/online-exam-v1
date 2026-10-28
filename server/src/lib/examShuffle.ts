import { createHash } from 'node:crypto';

type QuestionIdentity = { id: string };

function rank(seed: string, scope: string, key: string): string {
  return createHash('sha256')
    .update(`${seed}:${scope}:${key}`)
    .digest('hex');
}

/**
 * Stable, attempt-scoped order. Legacy attempts without a seed keep their
 * original order, so deployment does not scramble active attempts.
 */
export function shuffleExamQuestions<T extends QuestionIdentity>(
  questions: readonly T[],
  seed: string | null | undefined,
): T[] {
  if (!seed) return [...questions];

  return [...questions].sort((left, right) => {
    const difference = rank(seed, 'question', left.id).localeCompare(
      rank(seed, 'question', right.id),
    );
    return difference || left.id.localeCompare(right.id);
  });
}

/** Maps displayed option indexes to canonical snapshot indexes. */
export function getOptionOrder(
  optionCount: number,
  seed: string | null | undefined,
  questionId: string,
): number[] {
  const indexes = Array.from({ length: optionCount }, (_, index) => index);
  if (!seed) return indexes;

  return indexes.sort((left, right) => {
    const difference = rank(seed, `option:${questionId}`, String(left)).localeCompare(
      rank(seed, `option:${questionId}`, String(right)),
    );
    return difference || left - right;
  });
}
