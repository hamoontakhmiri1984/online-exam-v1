import { Pencil, Trash2 } from 'lucide-react';
import type { Question } from '../../../api/questionApi';

type QuestionCardProps = {
  question: Question;
  index: number;
  canEdit?: boolean;
  disabled?: boolean;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
};

function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  canEdit = true,
  disabled = false,
}: QuestionCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 whitespace-pre-wrap break-words font-medium text-gray-800 dark:text-white">
          <span className="text-gray-400 dark:text-gray-500">
            {(index + 1).toLocaleString('fa-IR')}.
          </span>{' '}
          {question.text}
        </p>
        {canEdit && <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            aria-label="ویرایش سوال"
            onClick={() => onEdit(question)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400 transition"
            title="ویرایش"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label="حذف سوال"
            onClick={() => onDelete(question)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400 transition"
            title="حذف"
          >
            <Trash2 size={16} />
          </button>
        </div>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => (
          <div
            key={optionIndex}
            className={`break-words rounded-xl border px-4 py-2 text-sm ${
              optionIndex === question.correctOptionIndex
                ? 'border-success-500/40 bg-success-500/10 text-success-600 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-500'
                : 'border-gray-100 text-gray-600 dark:border-gray-800 dark:text-gray-300'
            }`}
          >
            {option}{optionIndex === question.correctOptionIndex && <span className="mr-2 text-xs font-bold">✓ پاسخ صحیح</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuestionCard;
