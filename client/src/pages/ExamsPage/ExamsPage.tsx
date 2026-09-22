import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getExams,
  addExam,
  updateExam,
  deleteExam,
  publishExam,
  unpublishExam,
  type Exam,
} from '../../api/examApi';
import { ApiError } from '../../lib/apiClient';
import { XCircle, AlertTriangle, ClipboardList } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import ExamRow from './components/ExamRow';
import ExamFormModal from './components/ExamFormModal';
import DeleteExamModal from './components/DeleteExamModal';
import PlanLimitModal from './components/PlanLimitModal';
import useCrud from '../../hooks/useCrud';
import useScope from '../../hooks/useScope';
import useGroups from '../../hooks/useGroups';
import useExamFormModal from '../../hooks/useExamFormModal';
import useInstructorPlanLimit from '../../hooks/useInstructorPlanLimit';
import { getCurrentUser } from '../../api/authApi';
import { getRemainingActiveExamQuota } from '../../api/subscriptionApi';
import { MANAGEMENT_ROLES } from '../../constants/roles';
import {
  getGroups,
  getGroupsByInstructor,
  type Group,
} from '../../api/groupApi';

function ExamsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const {
    items: exams,
    loading,
    error,
    clearError,
    addItem,
    updateItem,
    deleteItem,
    patchItem,
  } = useCrud<Exam, Omit<Exam, 'id'>>({
    getAll: getExams,
    add: addExam,
    update: updateExam,
    remove: deleteExam,
  });

  const { visibleGroupIds } = useGroups();

  const { visibleItems: visibleExams } = useScope(
    exams,
    (exam) => exam.groupIds,
    { visibleGroupIds, currentUser }
  );

  const canManage =
    !!currentUser && MANAGEMENT_ROLES.includes(currentUser.role);

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const request =
      currentUser.role === 'Instructor'
        ? getGroupsByInstructor(currentUser.id)
        : getGroups();
    let cancelled = false;

    // بدون catch با خطای شبکه unhandled rejection می‌شد؛ فرم آزمون با لیست
    // گروهِ خالی باز می‌شه
    request
      .then((groups) => {
        if (!cancelled) setAvailableGroups(groups);
      })
      .catch(() => {
        if (!cancelled) setAvailableGroups([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.role]);

  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function handlePublish(exam: Exam) {
    try {
      const updated = await publishExam(exam.id);
      patchItem(updated);
    } catch (err) {
      setPublishError(
        err instanceof ApiError ? err.message : 'انتشار آزمون با خطا مواجه شد'
      );
    }
  }

  async function handleUnpublish(exam: Exam) {
    try {
      const updated = await unpublishExam(exam.id);
      patchItem(updated);
    } catch (err) {
      setPublishError(
        err instanceof ApiError
          ? err.message
          : 'لغو انتشار آزمون با خطا مواجه شد'
      );
    }
  }

  const planLimit = useInstructorPlanLimit({
    isGated: currentUser?.role === 'Instructor',
    fetchQuota: () => getRemainingActiveExamQuota(currentUser?.id ?? ''),
  });

  const form = useExamFormModal({ exams, addItem, updateItem });

  async function openAddModal() {
    if (await planLimit.ensureAllowed()) form.openAdd();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <AppLayout title="آزمون‌ها">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}
      {publishError && (
        <Toast
          message={publishError}
          tone="danger"
          icon={XCircle}
          onDismiss={() => setPublishError(null)}
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
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold dark:text-white">آزمون‌ها</h1>
            {canManage && (
              <button
                onClick={openAddModal}
                disabled={planLimit.checkingLimit}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition disabled:opacity-60"
              >
                + آزمون جدید
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
            {visibleExams.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={
                  canManage ? 'هنوز آزمونی نساختی' : 'هنوز آزمونی برات ثبت نشده'
                }
                description={
                  canManage
                    ? 'با دکمه‌ی «آزمون جدید» اولین آزمونت رو بساز و به یک یا چند گروه وصلش کن.'
                    : 'وقتی مدرس آزمونی برای گروهت تعریف کنه، اینجا نشون داده می‌شه.'
                }
                action={
                  canManage
                    ? { label: '+ آزمون جدید', onClick: openAddModal }
                    : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-right text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="py-2">عنوان</th>
                      <th className="py-2">دسته‌بندی</th>
                      <th className="py-2">تاریخ</th>
                      {canManage && <th className="py-2">شرکت‌کنندگان</th>}
                      <th className="py-2">وضعیت</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleExams.map((exam) => (
                      <ExamRow
                        key={exam.id}
                        exam={exam}
                        canManage={canManage}
                        participantCount={exam.participants}
                        onTake={(e) => navigate(`/exams/${e.id}/take`)}
                        onOpenQuestions={(e) =>
                          navigate(`/exams/${e.id}/questions`)
                        }
                        onEdit={form.openEdit}
                        onDelete={setDeleteTarget}
                        onPublish={handlePublish}
                        onUnpublish={handleUnpublish}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ExamFormModal
        isOpen={form.isOpen}
        isEditing={!!form.editingId}
        title={form.title}
        onTitleChange={form.setTitle}
        category={form.category}
        onCategoryChange={form.setCategory}
        scheduledDate={form.scheduledDate}
        onScheduledDateChange={form.setScheduledDate}
        scheduledTime={form.scheduledTime}
        onScheduledTimeChange={form.setScheduledTime}
        durationMinutes={form.durationMinutes}
        onDurationChange={form.setDurationMinutes}
        allowReview={form.allowReview}
        onAllowReviewChange={() => form.setAllowReview((prev) => !prev)}
        availableGroups={availableGroups}
        groupIds={form.groupIds}
        onToggleGroup={form.toggleGroup}
        onSubmit={form.handleSubmit}
        onClose={form.close}
      />

      <DeleteExamModal
        isOpen={!!deleteTarget}
        examTitle={deleteTarget?.title}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <PlanLimitModal
        quota={planLimit.limitQuota}
        onClose={planLimit.dismissLimit}
      />
    </AppLayout>
  );
}

export default ExamsPage;
