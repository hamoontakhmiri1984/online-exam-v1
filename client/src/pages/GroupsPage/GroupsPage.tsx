import { useEffect, useState } from 'react';
import { Users, Plus, XCircle, AlertTriangle } from 'lucide-react';
import {
  getGroupsPage,
  addGroup,
  updateGroup,
  deleteGroup,
  regenerateJoinCode,
  type Group,
} from '../../api/groupApi';
import { getCurrentUser } from '../../api/authApi';
import { ApiError } from '../../lib/apiClient';
import { getStudents, type Student } from '../../api/studentApi';
import { getRemainingGroupQuota } from '../../api/subscriptionApi';
import usePagedCrud from '../../hooks/usePagedCrud';
import ListPagination from '../../components/ListPagination/ListPagination';
import useGroupFormModal from '../../hooks/useGroupFormModal';
import useInstructorPlanLimit from '../../hooks/useInstructorPlanLimit';
import AppLayout from '../../components/AppLayout/AppLayout';
import LearningPageLayout from '../../components/LearningPageLayout/LearningPageLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import GroupCard from './components/GroupCard';
import GroupFormModal from './components/GroupFormModal';
import DeleteGroupModal from './components/DeleteGroupModal';
import PlanLimitModal from './components/PlanLimitModal';

function GroupsPage() {
  const currentUser = getCurrentUser();

  const {
    items: groups,
    loading,
    error,
    clearError,
    addItem,
    updateItem,
    deleteItem,
    patchItem,
    page, pageSize, total, q, setPage, setSearch,
  } = usePagedCrud<Group, Omit<Group, 'id' | 'joinCode'>>({
    getPage: getGroupsPage,
    add: addGroup,
    update: updateGroup,
    remove: deleteGroup,
  });

  const visibleGroups =
    currentUser?.role === 'SuperAdmin'
      ? groups
      : groups.filter((g) => g.instructorId === currentUser?.id);

  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    getStudents()
      .then(setAllStudents)
      .catch(() => setAllStudents([]));
  }, []);

  const students = allStudents;

  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const planLimit = useInstructorPlanLimit({
    isGated: currentUser?.role === 'Instructor',
    fetchQuota: () => getRemainingGroupQuota(currentUser?.id ?? ''),
  });

  const form = useGroupFormModal({
    instructorId: currentUser?.id ?? '',
    addItem,
    updateItem,
  });

  async function handleCopyCode(group: Group) {
    try {
      await navigator.clipboard.writeText(group.joinCode);
      setCopiedGroupId(group.id);
      setTimeout(() => setCopiedGroupId(null), 1500);
    } catch {}
  }

  async function handleRegenerateCode(group: Group) {
    setRegeneratingId(group.id);
    setCodeError(null);
    try {
      const updated = await regenerateJoinCode(group.id);
      patchItem(updated);
    } catch (err) {
      setCodeError(
        err instanceof ApiError
          ? err.message
          : 'ساخت کد عضویت جدید با خطا مواجه شد'
      );
    } finally {
      setRegeneratingId(null);
    }
  }

  async function openAddModal() {
    if (await planLimit.ensureAllowed()) form.openAdd();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <AppLayout title="گروه‌ها">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}
      {codeError && (
        <Toast
          message={codeError}
          tone="danger"
          icon={XCircle}
          onDismiss={() => setCodeError(null)}
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
        eyebrow="مدیریت کلاس‌ها"
        title="گروه‌ها"
        description="گروه‌های آموزشی را بسازید، اعضا را مدیریت کنید و کد عضویت را در اختیار دانشجویان قرار دهید."
        icon={Users}
        actions={
          <button
            type="button"
            onClick={openAddModal}
            disabled={planLimit.checkingLimit}
            className="ui-primary-gradient inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:cursor-wait disabled:opacity-50"
          >
            <Plus size={18} aria-hidden="true" />
            گروه جدید
          </button>
        }
      >
        <ListPagination {...{ page, pageSize, total, loading, q, setPage, setSearch }} />
        {loading ? (
          <Spinner />
        ) : visibleGroups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="هنوز گروهی نساخته‌اید"
            description="برای شروع یک گروه آموزشی بسازید؛ سپس دانشجویان را اضافه کنید و آزمون‌ها و درس‌ها را به آن اختصاص دهید."
            action={{ label: '+ گروه جدید', onClick: openAddModal }}
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
            {visibleGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                isCopied={copiedGroupId === group.id}
                isRegenerating={regeneratingId === group.id}
                onCopyCode={handleCopyCode}
                onRegenerateCode={handleRegenerateCode}
                onEdit={form.openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </LearningPageLayout>

      <GroupFormModal
        isOpen={form.isOpen}
        isEditing={!!form.editingId}
        name={form.name}
        onNameChange={form.setName}
        category={form.category}
        onCategoryChange={form.setCategory}
        students={students}
        studentIds={form.studentIds}
        onToggleStudent={form.toggleStudent}
        onSubmit={form.handleSubmit}
        validationError={form.validationError}
        onClose={form.close}
      />

      <DeleteGroupModal
        isOpen={!!deleteTarget}
        groupName={deleteTarget?.name}
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

export default GroupsPage;
