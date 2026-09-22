import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, XCircle, AlertTriangle, Video } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import SessionPlayer from './components/SessionPlayer';
import SessionListItem from './components/SessionListItem';
import SessionFormModal from './components/SessionFormModal';
import DeleteSessionModal from './components/DeleteSessionModal';
import useLessonSessions from '../../hooks/useLessonSessions';
import useSessionFormModal from '../../hooks/useSessionFormModal';
import { getGroupById, type Group } from '../../api/groupApi';
import { getCurrentUser } from '../../api/authApi';
import { MANAGEMENT_ROLES } from '../../constants/roles';
import type { LessonSession } from '../../api/lessonApi';

function GroupLessonsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const canManage =
    !!currentUser && MANAGEMENT_ROLES.includes(currentUser.role);

  const [group, setGroup] = useState<Group | null>(null);
  const [groupLoading, setGroupLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!groupId) {
      setGroupLoading(false);
      return;
    }

    let cancelled = false;
    setGroupLoading(true);

    // قبلاً catch نداشت: با خطای شبکه/سرور groupLoading برای همیشه true
    // می‌موند و کل صفحه یه اسپینر بی‌نهایت می‌شد. حالا خطا یعنی «گروه
    // پیدا نشد» و پیام عدم‌دسترسی نشون داده می‌شه.
    getGroupById(groupId)
      .then((data) => {
        if (!cancelled) setGroup(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setGroup(null);
      })
      .finally(() => {
        if (!cancelled) setGroupLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const hasGroupAccess =
    !!group &&
    !!currentUser &&
    (currentUser.role === 'SuperAdmin' ||
      (currentUser.role === 'Instructor' &&
        group.instructorId === currentUser.id) ||
      (currentUser.role === 'Student' &&
        group.studentIds.includes(currentUser.id)));

  const [deleteTarget, setDeleteTarget] = useState<LessonSession | null>(null);

  const {
    sessions,
    loading,
    error,
    clearError,
    activeSession,
    setActiveSession,
    addItem,
    updateItem,
    deleteItem,
  } = useLessonSessions({
    groupId,
    enabled: !groupLoading && hasGroupAccess,
  });

  const form = useSessionFormModal({
    groupId,
    category: group?.category,
    addItem,
    updateItem,
  });

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <AppLayout title={group ? `درس ${group.name}` : 'درس'}>
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
        onClick={() => navigate('/lessons')}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition"
      >
        <ArrowRight size={16} />
        بازگشت به درس‌ها
      </button>

      {groupLoading ? (
        <Spinner />
      ) : !hasGroupAccess ? (
        <div className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          دسترسی به این گروه برای شما مجاز نیست.
        </div>
      ) : loading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold dark:text-white">
              {group?.name}
            </h1>
            {canManage && (
              <button
                type="button"
                onClick={form.openAdd}
                className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition text-sm"
              >
                <Plus size={16} />
                جلسه جدید
              </button>
            )}
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              icon={Video}
              title="هنوز جلسه‌ای برای این درس ثبت نشده"
              description={
                canManage
                  ? 'با دکمه‌ی «جلسه جدید» اولین ویدیوی این گروه رو اضافه کن.'
                  : 'وقتی مدرس ویدیویی برای این گروه اضافه کنه، اینجا نشون داده می‌شه.'
              }
              action={
                canManage
                  ? { label: '+ جلسه جدید', onClick: form.openAdd }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SessionPlayer session={activeSession} />
              </div>

              <div className="flex flex-col gap-2">
                {sessions.map((session, index) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    index={index}
                    isActive={activeSession?.id === session.id}
                    canManage={canManage}
                    onSelect={setActiveSession}
                    onEdit={form.openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <SessionFormModal
        isOpen={form.isOpen}
        isEditing={!!form.editingId}
        title={form.title}
        onTitleChange={form.setTitle}
        description={form.description}
        isSubmitting={form.isSubmitting}
        onDescriptionChange={form.setDescription}
        videoType={form.videoType}
        onVideoTypeChange={form.setVideoType}
        videoUrl={form.videoUrl}
        onVideoUrlChange={form.setVideoUrl}
        uploadedFile={form.uploadedFile}
        isUploading={form.isUploading}
        onFileChange={form.handleFileChange}
        attachments={form.attachments}
        isUploadingAttachment={form.isUploadingAttachment}
        onAttachmentChange={form.handleAttachmentChange}
        onRemoveAttachment={form.removeAttachment}
        onSubmit={form.handleSubmit}
        onClose={form.close}
      />

      <DeleteSessionModal
        isOpen={!!deleteTarget}
        sessionTitle={deleteTarget?.title}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}

export default GroupLessonsPage;
