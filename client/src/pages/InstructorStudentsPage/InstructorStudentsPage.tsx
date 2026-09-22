import { Fragment } from 'react';
import { ChevronDown, GraduationCap, Layers, XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import useInstructorOverview from '../../hooks/useInstructorOverview';

function InstructorStudentsPage() {
  const {
    instructors,
    groupsByInstructor,
    studentsById,
    uniqueStudentCount,
    loading,
    error,
    clearError,
    expandedId,
    toggleExpanded,
  } = useInstructorOverview();

  return (
    <AppLayout title="مدرس‌ها و دانشجوها">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}

      <h1 className="text-2xl font-bold mb-1 dark:text-white">
        مدرس‌ها و دانشجوها
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        روی هر مدرس بزن تا گروه‌ها و دانشجوهایی که زیرشن رو جدا از بقیه ببینی
      </p>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
        {loading ? (
          <Spinner />
        ) : instructors.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="کسی اینجا نیست"
            description="هنوز مدرسِ تاییدشده‌ای تو سیستم نیست."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-right text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2"></th>
                  <th className="py-2">مدرس</th>
                  <th className="py-2">ایمیل/شماره</th>
                  <th className="py-2">تعدادِ گروه</th>
                  <th className="py-2">تعدادِ دانشجو</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((instructor) => {
                  const groups = groupsByInstructor.get(instructor.id) ?? [];
                  const isExpanded = expandedId === instructor.id;

                  return (
                    <Fragment key={instructor.id}>
                      <tr
                        onClick={() => toggleExpanded(instructor.id)}
                        className="cursor-pointer border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 transition duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 w-8">
                          <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </td>
                        <td className="py-3 font-medium">
                          {instructor.name || instructor.username}
                        </td>
                        <td className="py-3 text-gray-400 dark:text-gray-500">
                          {instructor.email || instructor.phone || '—'}
                        </td>
                        <td className="py-3">
                          {groups.length.toLocaleString('fa-IR')}
                        </td>
                        <td className="py-3">
                          {uniqueStudentCount(instructor.id).toLocaleString(
                            'fa-IR'
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                          <td colSpan={5} className="p-4">
                            {groups.length === 0 ? (
                              <p className="text-center text-sm text-gray-400 py-4">
                                این مدرس هنوز هیچ گروهی نساخته
                              </p>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {groups.map((group) => (
                                  <div
                                    key={group.id}
                                    className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4"
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <Layers
                                        size={14}
                                        className="text-brand-500"
                                      />
                                      <span className="font-medium text-gray-800 dark:text-white">
                                        {group.name}
                                      </span>
                                      <span className="rounded-full bg-brand-50 dark:bg-brand-950/40 px-2.5 py-0.5 text-xs text-brand-600 dark:text-brand-400">
                                        {group.category}
                                      </span>
                                      <span className="mr-auto text-xs text-gray-400">
                                        {group.studentIds.length.toLocaleString(
                                          'fa-IR'
                                        )}{' '}
                                        دانشجو
                                      </span>
                                    </div>

                                    {group.studentIds.length === 0 ? (
                                      <p className="text-xs text-gray-400">
                                        هنوز دانشجویی عضوِ این گروه نیست
                                      </p>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {group.studentIds.map((studentId) => {
                                          const student =
                                            studentsById.get(studentId);
                                          return (
                                            <span
                                              key={studentId}
                                              className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300"
                                            >
                                              {student?.name ?? 'دانشجوی حذف‌شده'}
                                              {student && (
                                                <span className="text-gray-400 dark:text-gray-500">
                                                  {' '}
                                                  · {student.username}
                                                </span>
                                              )}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default InstructorStudentsPage;
