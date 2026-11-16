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
import ExamOversightFilters, { filterOversightExams } from './components/ExamOversightFilters';
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
import { getMyResultsHistory } from '../../api/examAttemptApi';
import {
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
    writeError,
    clearWriteError,
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

  const canManage = currentUser?.role === 'Instructor';
  const isObserver = currentUser?.role === 'SuperAdmin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const reportExams = isObserver ? filterOversightExams(visibleExams, search, statusFilter) : visibleExams;
  const isFiltered = isObserver && !!(search.trim() || statusFilter);
  const pageTitle = 'آزمون‌ها';
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [finishedExamIds, setFinishedExamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser?.role !== 'Student') return;
    let cancelled = false;
    getMyResultsHistory().then((history) => {
      if (!cancelled) setFinishedExamIds(new Set(history.map((item) => item.exam.id)));
    }).catch(() => {
      // Keep exam list usable if the results service is temporarily unavailable.
    });
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role]);

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (currentUser?.role !== 'Instructor') return;
    const request = getGroupsByInstructor(currentUser.id);
    let cancelled = false;

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

  const form = useExamFormModal({ exams, updateItem, addItem: async input => {
    const created = await addItem(input);
    if (created) navigate(`/exams/${created.id}/questions`);
    return created;
  } });

  async function openAddModal() {
    if (await planLimit.ensureAllowed()) { clearWriteError(); form.openAdd(); }
  }

  function openEditModal(exam: Exam) {
    clearWriteError();
    form.openEdit(exam);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <AppLayout title={pageTitle}>
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
            <div><h1 className="text-2xl font-bold dark:text-white">{pageTitle}</h1>
            {isObserver && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">آزمون‌های ثبت‌شده توسط مدرس‌ها و میزان مشارکت دانشجویان؛ دسترسی فقط برای مشاهده است.</p>}</div>
          </div>

          {isObserver && <ExamOversightFilters query={search} status={statusFilter} count={reportExams.length} onQuery={setSearch} onStatus={setStatusFilter} />}
          <div className="ui-admin-table overflow-hidden rounded-2xl border border-violet-200/50 bg-white/90 shadow-sm dark:border-violet-400/15 dark:bg-gray-900/90">
            {reportExams.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={
                  isFiltered ? 'آزمونی با این مشخصات پیدا نشد' : isObserver ? 'هنوز آزمونی ثبت نشده است' : canManage ? 'هنوز آزمونی نساختی' : 'هنوز آزمونی برات ثبت نشده'
                }
                description={
                  isFiltered ? 'عبارت جستجو یا فیلتر وضعیت را تغییر دهید.' : isObserver ? 'پس از ثبت آزمون توسط مدرس‌ها، اطلاعات آن اینجا نمایش داده می‌شود.' : canManage
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
                  <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium">عنوان</th>
                      {isObserver && <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium">مدرس</th>}
                      <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium">دسته‌بندی</th>
                      <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium">تاریخ</th>
                      {(canManage || isObserver) && <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium" title="تعداد دانشجویانی که آزمون را شروع کرده‌اند">شرکت‌کنندگان</th>}
                      <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium">وضعیت</th>
                      <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium"><span className="sr-only">عملیات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportExams.map((exam) => (
                      <ExamRow
                        key={exam.id}
                        exam={exam}
                        canManage={canManage}
                        isObserver={isObserver}
                        selected={selectedExamId === exam.id}
                        onSelect={() => setSelectedExamId(exam.id)}
                        canTake={currentUser?.role === 'Student'}
                        hasFinished={finishedExamIds.has(exam.id)}
                        participantCount={exam.participants}
                        onTake={(e) => navigate(`/exams/${e.id}/take`)}
                        onOpenQuestions={(e) =>
                          navigate(`/exams/${e.id}/questions`)
                        }
                        onEdit={openEditModal}
                        onDelete={setDeleteTarget}
                        onPublish={handlePublish}
                        onUnpublish={handleUnpublish}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {canManage && reportExams.length > 0 && (
              <div className="flex items-center justify-center bg-violet-50/20 px-5 py-4 dark:bg-violet-500/5">
                <button type="button" onClick={openAddModal} disabled={planLimit.checkingLimit} className="ui-create-cta inline-flex min-h-12 w-full max-w-72 items-center justify-center rounded-xl px-8 text-sm font-bold shadow-md transition-shadow hover:shadow-lg disabled:opacity-50">
                  + آزمون جدید
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ExamFormModal
        isOpen={form.isOpen}
        isEditing={!!form.editingId}
        isSubmitting={form.isSubmitting}
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
        validationError={form.validationError}
        saveError={writeError}
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
