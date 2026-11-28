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
import { XCircle, AlertTriangle, ClipboardList, Plus } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import LearningPageLayout from '../../components/LearningPageLayout/LearningPageLayout';
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
  const pageDescription = isObserver
    ? 'آزمون‌های ثبت‌شده توسط مدرس‌ها و میزان مشارکت دانشجویان را در یک نمای مدیریتی بررسی کنید.'
    : canManage
      ? 'آزمون‌های گروه‌های خود را بسازید، زمان‌بندی کنید و وضعیت انتشار آن‌ها را مدیریت کنید.'
      : 'آزمون‌های اختصاص‌یافته به گروه‌های خود را ببینید و در زمان مقرر در آن‌ها شرکت کنید.';
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
      <LearningPageLayout
        eyebrow="مدیریت ارزیابی آموزشی"
        title={pageTitle}
        description={pageDescription}
        icon={ClipboardList}
        actions={canManage ? (
          <button
            type="button"
            onClick={openAddModal}
            disabled={planLimit.checkingLimit}
            className="ui-primary-gradient inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:cursor-wait disabled:opacity-50"
          >
            <Plus size={18} aria-hidden="true" />
            آزمون جدید
          </button>
        ) : undefined}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {isObserver && (
              <ExamOversightFilters
                query={search}
                status={statusFilter}
                count={reportExams.length}
                onQuery={setSearch}
                onStatus={setStatusFilter}
              />
            )}
            <div className="ui-admin-table overflow-hidden rounded-xl border border-violet-100 bg-white/80 dark:border-violet-400/15 dark:bg-slate-900/60">
              {reportExams.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title={
                    isFiltered ? 'آزمونی با این مشخصات پیدا نشد' : isObserver ? 'هنوز آزمونی ثبت نشده است' : canManage ? 'هنوز آزمونی نساخته‌اید' : 'هنوز آزمونی برای شما ثبت نشده است'
                  }
                  description={
                    isFiltered
                      ? 'عبارت جستجو یا فیلتر وضعیت را تغییر دهید.'
                      : isObserver
                        ? 'پس از ثبت آزمون توسط مدرس‌ها، اطلاعات آن اینجا نمایش داده می‌شود.'
                        : canManage
                          ? 'اولین آزمون را بسازید و آن را به یک یا چند گروه اختصاص دهید.'
                          : 'وقتی مدرس برای گروه شما آزمونی تعریف کند، اینجا نمایش داده می‌شود.'
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
                        {(canManage || isObserver) && (
                          <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium" title="تعداد دانشجویانی که آزمون را شروع کرده‌اند">
                            شرکت‌کنندگان
                          </th>
                        )}
                        <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium">وضعیت</th>
                        <th scope="col" className="whitespace-nowrap px-5 py-4 font-medium">
                          <span className="sr-only">عملیات</span>
                        </th>
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
                          onTake={(item) => navigate('/exams/' + item.id + '/take')}
                          onOpenQuestions={(item) => navigate('/exams/' + item.id + '/questions')}
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
            </div>
          </>
        )}
      </LearningPageLayout>

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
