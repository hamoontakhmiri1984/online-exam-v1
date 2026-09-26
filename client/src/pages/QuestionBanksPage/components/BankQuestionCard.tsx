import { Pencil, Trash2 } from 'lucide-react';

import type {
  BankQuestion,
  QuestionDifficulty,
} from '../../../api/questionBankApi';

const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  Easy: 'آسان',
  Medium: 'متوسط',
  Hard: 'سخت',
};

type BankQuestionCardProps = {
  question: BankQuestion;
  order: number;
  onEdit: (question: BankQuestion) => void;
  onDelete: (question: BankQuestion) => void;
};

function BankQuestionCard({
  question,
  order,
  onEdit,
  onDelete,
}: BankQuestionCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">
            {order.toLocaleString('fa-IR')}. {question.text}
          </p>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {question.options.map((option, optionIndex) => (
              <div
                key={optionIndex}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  optionIndex === question.correctOptionIndex
                    ? 'border-success-300 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-950/30 dark:text-success-300'
                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                {option}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-400">
            سختی:{' '}
            {DIFFICULTY_LABELS[question.difficulty] ?? question.difficulty}
          </p>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(question)}
            aria-label="ویرایش سوال"
            title="ویرایش"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(question)}
            aria-label="حذف سوال"
            title="حذف"
            className="rounded-lg p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default BankQuestionCard;