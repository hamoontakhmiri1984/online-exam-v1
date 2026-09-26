import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Upload } from 'lucide-react';

import AppLayout from '../../components/AppLayout/AppLayout';

import useBankQuestions from '../../hooks/useBankQuestions';
import useImportBankQuestionsModal from '../../hooks/useImportBankQuestionsModal';
import ImportBankQuestionsModal from './components/ImportBankQuestionsModal';
import BankQuestionForm from './components/BankQuestionForm';
import BankQuestionList from './components/BankQuestionList';

import type { BankQuestion, BankQuestionInput } from '../../api/questionBankApi';

const EMPTY_OPTIONS = ['', '', '', ''];

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
        <BankQuestionForm
          form={form}
          isEditing={editing !== null}
          saving={saving}
          error={error}
          canSubmit={canSubmit}
          onTextChange={(text) =>
            setForm((current) => ({ ...current, text }))
          }
          onOptionChange={updateOption}
          onCorrectOptionChange={(index) =>
            setForm((current) => ({ ...current, correctOptionIndex: index }))
          }
          onDifficultyChange={(difficulty) =>
            setForm((current) => ({ ...current, difficulty }))
          }
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />

        <section>
          <BankQuestionList
            questions={questions}
            loading={loading}
            onEdit={startEdit}
            onDelete={(question) => void handleDelete(question)}
          />
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