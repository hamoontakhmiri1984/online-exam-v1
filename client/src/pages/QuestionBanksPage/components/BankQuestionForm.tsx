import { Plus } from 'lucide-react';

import type {
  BankQuestionInput,
  QuestionDifficulty,
} from '../../../api/questionBankApi';

type BankQuestionFormProps = {
  form: BankQuestionInput;
  isEditing: boolean;
  saving: boolean;
  error: string;
  canSubmit: boolean;
  onTextChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onCorrectOptionChange: (index: number) => void;
  onDifficultyChange: (value: QuestionDifficulty) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
};

function BankQuestionForm({
  form,
  isEditing,
  saving,
  error,
  canSubmit,
  onTextChange,
  onOptionChange,
  onCorrectOptionChange,
  onDifficultyChange,
  onSubmit,
  onCancel,
}: BankQuestionFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-5 flex items-center gap-2">
        <Plus size={20} className="text-brand-600" />

        <h2 className="font-bold text-gray-900 dark:text-white">
          {isEditing ? 'ویرایش سوال' : 'سوال جدید'}
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <textarea
          value={form.text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="متن سوال"
          aria-label="متن سوال"
          rows={4}
          className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />

        {form.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct-option"
              aria-label={`گزینه ${index + 1} جواب درست است`}
              checked={form.correctOptionIndex === index}
              onChange={() => onCorrectOptionChange(index)}
            />

            <input
              value={option}
              onChange={(event) => onOptionChange(index, event.target.value)}
              placeholder={`گزینه ${index + 1}`}
              aria-label={`گزینه ${index + 1}`}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        ))}

        <select
          aria-label="سطح سختی"
          value={form.difficulty}
          onChange={(event) =>
            onDifficultyChange(event.target.value as QuestionDifficulty)
          }
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="Easy">آسان</option>
          <option value="Medium">متوسط</option>
          <option value="Hard">سخت</option>
        </select>

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving
              ? 'در حال ذخیره...'
              : isEditing
              ? 'ذخیره تغییرات'
              : 'افزودن سوال'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 px-4 text-sm dark:border-gray-600"
            >
              انصراف
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export default BankQuestionForm;