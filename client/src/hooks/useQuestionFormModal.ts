import { useState } from 'react';
import type { Question } from '../api/questionApi';

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

type QuestionInput = Omit<Question, 'id' | 'examId'>;

type UseQuestionFormModalParams = {
  addItem: (input: QuestionInput) => Promise<unknown>;
  updateItem: (id: string, input: QuestionInput) => Promise<unknown>;
};

function useQuestionFormModal({
  addItem,
  updateItem,
}: UseQuestionFormModalParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openAdd() {
    setEditingId(null);
    setText('');
    setOptions(['', '']);
    setCorrectOptionIndex(0);
    setIsOpen(true);
  }

  function openEdit(question: Question) {
    setEditingId(question.id);
    setText(question.text);
    setOptions(question.options);
    setCorrectOptionIndex(question.correctOptionIndex);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setValidationError(null);
  }

  function updateOptionText(index: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(index: number) {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    if (correctOptionIndex === index) {
      setCorrectOptionIndex(0);
    } else if (correctOptionIndex > index) {
      setCorrectOptionIndex((prev) => prev - 1);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // جلوگیری از ثبت دوباره با دوبار کلیک / Enter پشت‌سرهم (وگرنه دوتا سوالِ
    // یکسان ساخته می‌شد)
    if (isSubmitting) return;

    const trimmedOptions = options.map((opt) => opt.trim());

    if (!text.trim() || trimmedOptions.some((opt) => !opt)) {
      setValidationError('لطفاً متن سوال و همه‌ی گزینه‌ها را پر کنید');
      return;
    }

    const questionData: QuestionInput = {
      text: text.trim(),
      options: trimmedOptions,
      correctOptionIndex,
    };

    setIsSubmitting(true);

    let saved: unknown;

    try {
      saved = editingId
        ? await updateItem(editingId, questionData)
        : await addItem(questionData);
    } finally {
      setIsSubmitting(false);
    }

    // useCrud/هوک صفحه موقع خطا پیام رو تو Toast نشون می‌ده و undefined برمی‌گردونه؛
    // تو اون حالت مودال باز می‌مونه تا اطلاعات واردشده از بین نره
    if (saved) {
      setIsOpen(false);
    }
  }

  return {
    isOpen,
    editingId,
    text,
    setText,
    options,
    correctOptionIndex,
    setCorrectOptionIndex,
    validationError,
    isSubmitting,
    dismissValidationError: () => setValidationError(null),
    openAdd,
    openEdit,
    close,
    updateOptionText,
    addOption,
    removeOption,
    handleSubmit,
  };
}

export default useQuestionFormModal;
