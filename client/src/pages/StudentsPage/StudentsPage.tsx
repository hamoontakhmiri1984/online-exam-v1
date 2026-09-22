import { useState } from 'react';
import { getStudents, deleteStudent, type Student } from '../../api/studentApi';
import { Trash2, XCircle, Users } from 'lucide-react';
import Modal from '../../components/Modal/Modal';
import AppLayout from '../../components/AppLayout/AppLayout';
import useCrud from '../../hooks/useCrud';
import useGroups from '../../hooks/useGroups';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';

function StudentsPage() {
  const {
    items: students,
    loading,
    error,
    clearError,
    deleteItem,
  } = useCrud<Student, Omit<Student, 'id'>>({
    getAll: getStudents,
    remove: deleteStudent,
  });
  const {
    groups,
    visibleGroups,
    currentUser,
    loading: groupsLoading,
  } = useGroups();

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  function askDelete(student: Student) {
    setDeleteTarget(student);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    // حذف واقعی + جدا شدن از تمام گروه‌ها هر دو سمت سرور تو همین یه درخواست
    // انجام می‌شن (DELETE /students/:id - نگاه کن به server/src/routes/students.ts)
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  }

  const relevantGroups =
    currentUser?.role === 'SuperAdmin' ? groups : visibleGroups;

  const visibleStudents =
    currentUser?.role === 'SuperAdmin'
      ? students
      : students.filter((s) =>
          relevantGroups.some((g) => g.studentIds.includes(s.id))
        );

  function groupNamesFor(studentId: string): string[] {
    return relevantGroups
      .filter((g) => g.studentIds.includes(studentId))
      .map((g) => g.name);
  }

  const isLoading = loading || groupsLoading;

  return (
    <AppLayout title="دانشجویان">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold dark:text-white">دانشجویان</h1>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
            {visibleStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="هنوز دانشجویی ثبت‌نام نکرده"
                description="دانشجوها با کد عضویت گروه، از صفحه‌ی ثبت‌نام خودشون وارد سامانه می‌شن. کد عضویت هر گروه رو از صفحه‌ی «گروه‌ها» بردار و در اختیارشون بذار."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-right text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="py-2">نام</th>
                      <th className="py-2">ایمیل یا شماره موبایل</th>
                      <th className="py-2">گروه‌ها</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => {
                      const groupNames = groupNamesFor(student.id);
                      return (
                        <tr
                          key={student.id}
                          className="border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 transition duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-3">{student.name}</td>
                          <td className="py-3 text-gray-400 dark:text-gray-500">
                            {student.username}
                          </td>
                          <td className="py-3">
                            {groupNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {groupNames.map((name) => (
                                  <span
                                    key={name}
                                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-400"
                                  >
                                    <Users size={12} />
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                عضو هیچ گروهی نیست
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => askDelete(student)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400 transition"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h2 className="text-lg font-bold mb-2 dark:text-white">حذف دانشجو</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {currentUser?.role === 'SuperAdmin'
            ? `آیا از حذف «${deleteTarget?.name}» مطمئنی؟ حساب کاربری‌اش کامل و برای همیشه پاک می‌شه. این عملیات قابل بازگشت نیست.`
            : `آیا از حذف «${deleteTarget?.name}» مطمئنی؟ فقط از تمام گروه‌های تو بیرون می‌شه (حسابش پاک نمی‌شه). این عملیات قابل بازگشت نیست.`}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            انصراف
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 rounded-xl bg-danger-600 py-2.5 text-sm font-medium text-white hover:bg-danger-700 transition"
          >
            حذف
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default StudentsPage;
