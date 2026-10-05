import type { QuestionDifficulty } from '../../api/questionBankApi';
export const difficultyLabels: Record<QuestionDifficulty, string> = {
  Easy: 'آسان',
  Medium: 'متوسط',
  Hard: 'سخت',
};
const colors = {
  Easy: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Medium:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Hard: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
};
export default function QuestionDifficultyBadge({
  difficulty,
}: {
  difficulty: QuestionDifficulty;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colors[difficulty]}`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
      {difficultyLabels[difficulty]}
    </span>
  );
}
