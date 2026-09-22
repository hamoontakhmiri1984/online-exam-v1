import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  FileQuestion,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import EmptyState from '../../components/EmptyState/EmptyState';

import useBankQuestions from '../../hooks/useBankQuestions';
import useImportBankQuestionsModal from '../../hooks/useImportBankQuestionsModal';
import ImportBankQuestionsModal from './components/ImportBankQuestionsModal';

import type {
  BankQuestion,
  BankQuestionInput,
  QuestionDifficulty,
} from '../../api/questionBankApi';

const EMPTY_OPTIONS = ['', '', '', ''];

const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  Easy: 'آسان',
  Medium: 'متوسط',
  Hard: 'سخت',
};

const EMPTY_FORM: BankQuestionInput = {
  text: '',
  options: EMPTY_OPTIONS,
  correctOptionIndex: 0,
  difficulty: 'Medium',
};

function QuestionBankDetailsPage() {
  const { bankId } = useParams();
  const navigate = useNavigate();

  const {
    questions,
    loading,
    error,
    reload,
    addQuestion,
    editQuestion,
    removeQuestion,
  } = useBankQuestions(bankId);

  const importModal = useImportBankQuestionsModal({
    bankId,
    onImported: reload,
  });

  const [form, setForm] = useState<BankQuestionInput>(EMPTY_FORM);

  const [editing, setEditing] = useState<BankQuestion | null>(null);

  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.text.trim().length > 0 &&
      form.options.length >= 2 &&
      form.options.every((option) => option.trim().length > 0) &&
      form.correctOptionIndex >= 0 &&
      form.correctOptionIndex < form.options.length
    );
  }, [form]);

  function resetForm() {
    setEditing(null);

    setForm({
      ...EMPTY_FORM,
      options: [...EMPTY_OPTIONS],
    });
  }

  function startEdit(question: BankQuestion) {
    setEditing(question);

    setForm({
      text: question.text,
      options: [...question.options],
      correctOptionIndex: question.correctOptionIndex,
      difficulty: question.difficulty,
    });
  }

  function updateOption(index: number, value: string) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!canSubmit) return;

    const input: BankQuestionInput = {
      text: form.text.trim(),
      options: form.options.map((option) => option.trim()),
      correctOptionIndex: form.correctOptionIndex,
      difficulty: form.difficulty,
    };

    setSaving(true);

    try {
      const saved = editing
        ? await editQuestion(editing.id, input)
        : await addQuestion(input);

      // موقع خطا useBankQuestions پیام رو تو error می‌ذاره و null برمی‌گردونه؛
      // فرم پر می‌مونه تا مدرس اطلاعاتش رو از دست نده
      if (saved) resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(question: BankQuestion) {
    if (!window.confirm('این سوال حذف شود؟')) {
      return;
    }

    const removed = await removeQuestion(question.id);

    if (!removed) return;

    if (editing?.id === question.id) {
      resetForm();
    }
  }

  return (
    <AppLayout title="سوال‌های بانک">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/question-banks')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600"
        >
          <ArrowRight size={17} />
          بازگشت به بانک‌ها
        </button>

        <button
          type="button"
          onClick={importModal.open}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
        >
          <Upload size={16} />
          ایمپورت از اکسل
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-5 flex items-center gap-2">
            <Plus size={20} className="text-brand-600" />

            <h2 className="font-bold text-gray-900 dark:text-white">
              {editing ? 'ویرایش سوال' : 'سوال جدید'}
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <textarea
              value={form.text}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  text: event.target.value,
                }))
              }
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
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      correctOptionIndex: index,
                    }))
                  }
                />

                <input
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
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
                setForm((current) => ({
                  ...current,
                  difficulty: event.target.value as QuestionDifficulty,
                }))
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
                  : editing
                  ? 'ذخیره تغییرات'
                  : 'افزودن سوال'}
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-200 px-4 text-sm dark:border-gray-600"
                >
                  انصراف
                </button>
              )}
            </div>
          </div>
        </form>

        <section>
          {loading ? (
            <Spinner />
          ) : questions.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="هنوز سوالی وجود ندارد"
              description="اولین سوال این بانک را اضافه کن."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {questions.map((question, index) => (
                <article
                  key={question.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {(index + 1).toLocaleString('fa-IR')}. {question.text}
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
                        {DIFFICULTY_LABELS[question.difficulty] ??
                          question.difficulty}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(question)}
                        aria-label="ویرایش سوال"
                        title="ویرایش"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(question)}
                        aria-label="حذف سوال"
                        title="حذف"
                        className="rounded-lg p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ImportBankQuestionsModal
        isOpen={importModal.isOpen}
        file={importModal.file}
        isImporting={importModal.isImporting}
        importError={importModal.importError}
        createdCount={importModal.createdCount}
        rowErrors={importModal.rowErrors}
        onFileSelected={importModal.handleFileSelected}
        onDownloadTemplate={importModal.downloadTemplate}
        onConfirm={importModal.confirmImport}
        onClose={importModal.close}
      />
    </AppLayout>
  );
}

export default QuestionBankDetailsPage;
