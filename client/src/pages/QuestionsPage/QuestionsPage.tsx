import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Upload,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import QuestionCard from './components/QuestionCard';
import QuestionFormModal from './components/QuestionFormModal';
import DeleteQuestionModal from './components/DeleteQuestionModal';
import ImportQuestionsModal from './components/ImportQuestionsModal';
import PlanLimitModal from './components/PlanLimitModal';
import useQuestionBank from '../../hooks/useQuestionBank';
import useQuestionFormModal from '../../hooks/useQuestionFormModal';
import useQuestionImportModal from '../../hooks/useQuestionImportModal';
import useInstructorPlanLimit from '../../hooks/useInstructorPlanLimit';
import { getExamById, type Exam } from '../../api/examApi';
import type { Question } from '../../api/questionApi';
import { getCurrentUser } from '../../api/authApi';
import { getRemainingQuestionQuota } from '../../api/subscriptionApi';

function QuestionsPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [exam, setExam] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const {
    questions,
    loading,
    error,
    clearError,
    addItem,
    addMany,
    updateItem,
    deleteItem,
  } = useQuestionBank(examId ?? '');

  const planLimit = useInstructorPlanLimit({
    isGated: currentUser?.role === 'Instructor',
    fetchQuota: () => getRemainingQuestionQuota(currentUser?.id ?? ''),
  });

  const form = useQuestionFormModal({ addItem, updateItem });

  const importModal = useQuestionImportModal({
    addMany,
    getQuotaIfGated: planLimit.getQuotaIfGated,
    onLimitExceeded: planLimit.showLimit,
  });

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    // بدون catch، خطای شبکه یه unhandled rejection می‌شد (و عنوان صفحه همون
    // «بانک سوال» می‌موند)؛ عنوان حیاتی نیست، پس ساکت رد می‌شیم
    getExamById(examId)
      .then((data) => {
        if (!cancelled) setExam(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setExam(null);
      });

    return () => {
      cancelled = true;
    };
  }, [examId]);

  async function openAddModal() {
    if (await planLimit.ensureAllowed()) form.openAdd();
  }

  async function openImportModal() {
    if (await planLimit.ensureAllowed()) importModal.open();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <AppLayout title={exam ? `بانک سوال — ${exam.title}` : 'بانک سوال'}>
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}
      {form.validationError && (
        <Toast
          message={form.validationError}
          tone="warning"
          icon={AlertTriangle}
          onDismiss={form.dismissValidationError}
        />
      )}
      <button
        type="button"
        onClick={() => navigate('/exams')}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition"
      >
        <ArrowRight size={16} />
        بازگشت به لیست آزمون‌ها
      </button>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h1 className="text-2xl font-bold dark:text-white">
              سوالات {exam?.title}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={openImportModal}
                disabled={planLimit.checkingLimit}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition disabled:opacity-60"
              >
                <Upload size={16} />
                ایمپورت از اکسل
              </button>
              <button
                onClick={openAddModal}
                disabled={planLimit.checkingLimit}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition disabled:opacity-60"
              >
                + سوال جدید
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="هنوز سوالی برای این آزمون ثبت نشده"
              description="با دکمه‌ی «سوال جدید» بساز، یا سوالات رو یک‌جا از اکسل ایمپورت کن."
              action={{ label: '+ سوال جدید', onClick: openAddModal }}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onEdit={form.openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      <QuestionFormModal
        isOpen={form.isOpen}
        isEditing={!!form.editingId}
        isSubmitting={form.isSubmitting}
        text={form.text}
        onTextChange={form.setText}
        options={form.options}
        correctOptionIndex={form.correctOptionIndex}
        onCorrectOptionChange={form.setCorrectOptionIndex}
        onOptionTextChange={form.updateOptionText}
        onAddOption={form.addOption}
        onRemoveOption={form.removeOption}
        onSubmit={form.handleSubmit}
        onClose={form.close}
      />

      <DeleteQuestionModal
        isOpen={!!deleteTarget}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ImportQuestionsModal
        isOpen={importModal.isOpen}
        preview={importModal.preview}
        isParsing={importModal.isParsing}
        isImporting={importModal.isImporting}
        importError={importModal.importError}
        importWarning={importModal.importWarning}
        onFileSelected={importModal.handleFileSelected}
        onConfirm={importModal.confirmImport}
        onClose={importModal.close}
      />

      <PlanLimitModal
        quota={planLimit.limitQuota}
        onClose={planLimit.dismissLimit}
      />
    </AppLayout>
  );
}

export default QuestionsPage;
