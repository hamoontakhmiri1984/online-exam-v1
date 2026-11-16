import ListPagination from '../../components/ListPagination/ListPagination';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Upload, Plus, LibraryBig } from 'lucide-react';

import AppLayout from '../../components/AppLayout/AppLayout';
import { getCurrentUser } from '../../api/authApi';

import useBankQuestions from '../../hooks/useBankQuestions';
import useImportBankQuestionsModal from '../../hooks/useImportBankQuestionsModal';
import ImportBankQuestionsModal from './components/ImportBankQuestionsModal';
import BankQuestionForm from './components/BankQuestionForm';
import Modal from '../../components/Modal/Modal';
import ConfirmDeleteModal from '../../components/Modal/ConfirmDeleteModal';
import BankQuestionList from './components/BankQuestionList';

import { getQuestionBankById, type BankQuestion, type BankQuestionInput, type QuestionBank } from '../../api/questionBankApi';

const EMPTY_OPTIONS = ['', ''];

const EMPTY_FORM: BankQuestionInput = {
  text: '',
  options: EMPTY_OPTIONS,
  correctOptionIndex: 0,
  difficulty: 'Medium',
};

function QuestionBankDetailsPage() {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const canManage = getCurrentUser()?.role !== 'SuperAdmin';

  const {
    questions,
    loading,
    error,
    reload,
    addQuestion,
    editQuestion,
    removeQuestion,
    page, pageSize, total, q, setPage, setSearch,
  } = useBankQuestions(bankId);

  const importModal = useImportBankQuestionsModal({
    bankId,
    onImported: reload,
  });

  const [form, setForm] = useState<BankQuestionInput>(EMPTY_FORM);

  const [editing, setEditing] = useState<BankQuestion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [bankError, setBankError] = useState('');
  useEffect(() => {
    if (!bankId) return;
    let active = true;
    getQuestionBankById(bankId).then(result => { if (active) { setBank(result); setBankError(''); } }).catch(() => { if (active) setBankError('دریافت مشخصات بانک ممکن نشد.'); });
    return () => { active = false; };
  }, [bankId]);

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
    setFormOpen(false);
    setEditing(null);

    setForm({
      ...EMPTY_FORM,
      options: [...EMPTY_OPTIONS],
    });
  }

  function startEdit(question: BankQuestion) {
    setFormOpen(true);
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

  function addOption() {
    setForm(current => current.options.length >= 6
      ? current
      : { ...current, options: [...current.options, ''] });
  }

  function removeOption(index: number) {
    setForm(current => {
      if (current.options.length <= 2) return current;
      return {
        ...current,
        options: current.options.filter((_, i) => i !== index),
        correctOptionIndex: current.correctOptionIndex === index
          ? 0
          : current.correctOptionIndex > index
            ? current.correctOptionIndex - 1
            : current.correctOptionIndex,
      };
    });
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

      if (saved) resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const removed = await removeQuestion(deleteTarget.id);
      if (removed) {
        if (editing?.id === deleteTarget.id) resetForm();
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout title="مدیریت سؤال‌های بانک">
      <div className="mx-auto max-w-6xl" dir="rtl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/question-banks')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600"
        >
          <ArrowRight size={17} />
          بازگشت به بانک‌ها
        </button>

        {canManage && (
          <button
            type="button"
            onClick={importModal.open}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
          >
            <Upload size={16} />
            ایمپورت از اکسل
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-violet-200/50 bg-gradient-to-bl from-violet-50 via-white to-white p-5 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900">
        <div className="min-w-0"><p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300"><LibraryBig size={17}/> بانک سؤال</p><h1 className="break-words text-xl font-bold text-slate-800 dark:text-white">{bank?.name || "سؤال‌های بانک"}</h1><p className="mt-2 text-xs text-slate-500">{bank ? `دسته‌بندی: ${bank.category} • ${bank.questionCount.toLocaleString("fa-IR")} سؤال` : bankError || "سؤال‌ها را مدیریت کنید و پاسخ صحیح را مشخص کنید."}</p></div>
        {canManage && <button type="button" onClick={() => { resetForm(); setFormOpen(true); }} className="ui-primary-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus size={17}/> سؤال جدید</button>}
      </div>
      <section className="rounded-2xl border border-violet-100 bg-white p-4 dark:border-violet-400/15 dark:bg-slate-900 sm:p-5">
        <ListPagination {...{ page, pageSize, total, loading, q, setPage, setSearch }} />
        {error && <p role="alert" className="form-inline-error mb-3">{error}</p>}
        <BankQuestionList
          questions={questions}
          offset={(page - 1) * pageSize}
          loading={loading}
          onEdit={canManage ? startEdit : undefined}
          onDelete={canManage ? setDeleteTarget : undefined}
        />
      </section>
      </div>
      {canManage && <Modal isOpen={formOpen} onClose={() => { if (!saving) resetForm(); }} label={editing ? 'ویرایش سؤال بانک' : 'سؤال جدید بانک'} wide>
        <BankQuestionForm
          form={form}
          isEditing={editing !== null}
          saving={saving}
          error={error ?? ''}
          canSubmit={canSubmit}
          onTextChange={(text) => setForm((current) => ({ ...current, text }))}
          onOptionChange={updateOption}
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onCorrectOptionChange={(index) => setForm((current) => ({ ...current, correctOptionIndex: index }))}
          onDifficultyChange={(difficulty) => setForm((current) => ({ ...current, difficulty }))}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      </Modal>}
      <ConfirmDeleteModal isOpen={!!deleteTarget} title="حذف سؤال بانک"
        description="آیا این سؤال از بانک حذف شود؟ این عملیات قابل بازگشت نیست."
        busy={deleting} error={error ?? undefined}
        onConfirm={handleDelete} onClose={() => { if (!deleting) setDeleteTarget(null); }}
      />
      {canManage && (
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
      )}
    </AppLayout>
  );
}

export default QuestionBankDetailsPage;
