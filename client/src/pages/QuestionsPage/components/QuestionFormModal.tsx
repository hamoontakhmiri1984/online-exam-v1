import { Plus, X } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import { MIN_OPTIONS, MAX_OPTIONS } from '../../../hooks/useQuestionFormModal';

type QuestionFormModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting?: boolean;
  text: string;
  onTextChange: (value: string) => void;
  options: string[];
  correctOptionIndex: number;
  onCorrectOptionChange: (index: number) => void;
  onOptionTextChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

function QuestionFormModal({
  isOpen,
  isEditing,
  isSubmitting = false,
  text,
  onTextChange,
  options,
  correctOptionIndex,
  onCorrectOptionChange,
  onOptionTextChange,
  onAddOption,
  onRemoveOption,
  onSubmit,
  onClose,
}: QuestionFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-4 dark:text-white">
        {isEditing ? 'ویرایش سوال' : 'سوال جدید'}
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="question-text"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            متن سوال
          </label>
          <textarea
            id="question-text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={2}
            className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition resize-none"
            placeholder="متن سوال را بنویسید..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            گزینه‌ها (گزینه‌ی درست را انتخاب کنید)
          </span>

          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCorrectOptionChange(index)}
                aria-pressed={correctOptionIndex === index}
                aria-label={`گزینه ${String.fromCharCode(
                  65 + index
                )} جواب درست است`}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                  correctOptionIndex === index
                    ? 'border-success-500 bg-success-500 text-white'
                    : 'border-gray-300 text-gray-400 hover:border-success-500 dark:border-gray-600'
                }`}
                title="علامت‌گذاری به‌عنوان جواب درست"
              >
                {String.fromCharCode(65 + index)}
              </button>
              <input
                value={option}
                aria-label={`متن گزینه ${String.fromCharCode(65 + index)}`}
                onChange={(e) => onOptionTextChange(index, e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
                placeholder={`گزینه ${String.fromCharCode(65 + index)}`}
              />
              {options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  onClick={() => onRemoveOption(index)}
                  aria-label={`حذف گزینه ${String.fromCharCode(65 + index)}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-950/40 transition"
                  title="حذف گزینه"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}

          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={onAddOption}
              className="mt-1 flex items-center gap-1.5 self-start text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition"
            >
              <Plus size={16} />
              افزودن گزینه
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-brand-700 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEditing ? 'ذخیره تغییرات' : 'افزودن سوال'}
        </button>
      </form>
    </Modal>
  );
}

export default QuestionFormModal;
