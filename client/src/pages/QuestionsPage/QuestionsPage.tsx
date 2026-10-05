import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getCurrentUser } from '../../api/authApi';
import type { Question } from '../../api/questionApi';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import useExamQuestions from '../../hooks/useExamQuestions';
import useQuestionFormModal from '../../hooks/useQuestionFormModal';
import useQuestionImportModal from '../../hooks/useQuestionImportModal';
import ExamQuestionList from './components/ExamQuestionList';
import ExamQuestionHeader from './components/ExamQuestionHeader';
import QuestionFormModal from './components/QuestionFormModal';
import ImportQuestionsModal from './components/ImportQuestionsModal';
import DeleteQuestionModal from './components/DeleteQuestionModal';
import BankQuestionPicker from './components/BankQuestionPicker';
import QuestionSources from './components/QuestionSources';

// Keying by exam keeps pending requests and modal drafts isolated when the URL changes.
export default function QuestionsPage() {
  const { examId } = useParams();
  return examId ? (
    <ExamQuestionsEditor key={examId} examId={examId} />
  ) : (
    <AppLayout title="سؤال‌های آزمون">
      <p role="alert">شناسهٔ آزمون مشخص نیست.</p>
    </AppLayout>
  );
}

function ExamQuestionsEditor({ examId }: { examId: string }) {
  const editor = useExamQuestions(examId);
  const form = useQuestionFormModal(editor);
  const importer = useQuestionImportModal({
    addMany: editor.addMany,
  });
  const [bankOpen, setBankOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const { exam, questions, busy } = editor;
  const isInstructor = getCurrentUser()?.role === 'Instructor';
  const locked = !!exam && exam.participants > 0;
  const canEdit = isInstructor && !locked;
  const closeForm = () => {
    if (!busy) form.close();
  };
  const openManual = () => {
    editor.clearError();
    form.openAdd();
  };
  const openExcel = () => {
    editor.clearError();
    importer.open();
  };
  return (
    <AppLayout title="سؤال‌های آزمون">
      <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
        <Link
          to="/exams"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600"
        >
          <ArrowRight size={16} />
          بازگشت به آزمون‌ها
        </Link>
        {editor.loading ? (
          <Spinner />
        ) : editor.loadError || !exam ? (
          <div
            role="alert"
            className="rounded-2xl border border-danger-200 p-5"
          >
            <p>{editor.loadError}</p>
            <button onClick={editor.retry} className="mt-3 text-brand-600">
              تلاش مجدد
            </button>
          </div>
        ) : (
          <>
            <ExamQuestionHeader exam={exam} count={questions.length} />
            {locked ? (
              <p
                role="status"
                className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                این آزمون توسط شرکت‌کننده شروع شده است؛ برای حفظ صحت نتایج،
                سؤال‌ها فقط قابل مشاهده‌اند.
              </p>
            ) : !isInstructor ? (
              <p className="text-sm text-gray-500">
                نمای نظارت؛ ویرایش سؤال‌ها از پنل مدرس انجام می‌شود.
              </p>
            ) : (
              <QuestionSources
                onManual={openManual}
                onExcel={openExcel}
                onBank={() => {
                  editor.clearError();
                  setBankOpen(true);
                }}
                disabled={busy}
              />
            )}
            {editor.error && (
              <p
                role="alert"
                className="rounded-xl bg-danger-50 p-4 text-sm text-danger-600 dark:bg-danger-950"
              >
                {editor.error}
              </p>
            )}
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-success-600"
            >
              {editor.notice}
            </p>
            <ExamQuestionList
              questions={questions}
              canEdit={canEdit}
              busy={busy}
              onEdit={(q) => {
                editor.clearError();
                form.openEdit(q);
              }}
              onDelete={(q) => {
                editor.clearError();
                setDeleteTarget(q);
              }}
            />
            {canEdit && exam.status === 'draft' && (
              <footer className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm text-gray-500">
                  {questions.length
                    ? 'پس از بررسی سؤال‌ها، آزمون آمادهٔ انتشار است.'
                    : 'برای انتشار، حداقل یک سؤال اضافه کنید.'}
                </p>
                <button
                  disabled={busy || !questions.length}
                  onClick={editor.publish}
                  className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {busy ? 'در حال ذخیره…' : 'انتشار آزمون'}
                </button>
              </footer>
            )}
          </>
        )}
      </div>
      {canEdit && (
        <>
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
            onClose={closeForm}
            error={form.validationError || editor.error}
          />
          <ImportQuestionsModal
            isOpen={importer.isOpen}
            preview={importer.preview}
            isParsing={importer.isParsing}
            isImporting={importer.isImporting}
            importError={editor.error || importer.importError}
            importWarning={importer.importWarning}
            onFileSelected={importer.handleFileSelected}
            onConfirm={importer.confirmImport}
            onClose={importer.close}
          />
          <DeleteQuestionModal
            isOpen={!!deleteTarget}
            busy={busy}
            error={editor.error}
            onClose={() => {
              if (!busy) setDeleteTarget(null);
            }}
            onConfirm={async () => {
              if (deleteTarget && (await editor.remove(deleteTarget.id)))
                setDeleteTarget(null);
            }}
          />
          {bankOpen && (
            <BankQuestionPicker
              existing={questions}
              busy={busy}
              error={editor.error}
              onClose={() => setBankOpen(false)}
              onConfirm={editor.fromBank}
            />
          )}
        </>
      )}
    </AppLayout>
  );
}
