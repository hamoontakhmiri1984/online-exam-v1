import { useEffect, useState } from 'react';
import { Users, Plus, XCircle, AlertTriangle } from 'lucide-react';
import {
  getGroups,
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
import useCrud from '../../hooks/useCrud';
import useGroupFormModal from '../../hooks/useGroupFormModal';
import useInstructorPlanLimit from '../../hooks/useInstructorPlanLimit';
import AppLayout from '../../components/AppLayout/AppLayout';
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
  } = useCrud<Group, Omit<Group, 'id' | 'joinCode'>>({
    getAll: getGroups,
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

  const students =
    currentUser?.role === 'SuperAdmin'
      ? allStudents
      : allStudents.filter((s) =>
          visibleGroups.some((g) => g.studentIds.includes(s.id))
        );

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

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold dark:text-white">گروه‌ها</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                هر گروه یه دسته از دانشجوهاست؛ درس‌ها و آزمون‌ها رو به گروه وصل
                می‌کنی، نه مستقیم به تک‌تک دانشجوها
              </p>
            </div>
            <button
              onClick={openAddModal}
              disabled={planLimit.checkingLimit}
              className="flex shrink-0 items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition text-sm disabled:opacity-60"
            >
              <Plus size={16} />
              گروه جدید
            </button>
          </div>

          {visibleGroups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="هنوز گروهی نساختی"
              description="اول یه گروه بساز، بعد دانشجوها رو بهش اضافه کن تا بتونی آزمون و درس براشون تعریف کنی."
              action={{ label: '+ گروه جدید', onClick: openAddModal }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </>
      )}

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
