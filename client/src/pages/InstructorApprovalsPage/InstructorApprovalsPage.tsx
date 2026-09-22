import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import useInstructorApprovals from '../../hooks/useInstructorApprovals';
import { formatExamDateTime } from '../../utils/formatDate';
import type { InstructorApprovalStatus } from '../../api/adminApi';

const TABS: { value: InstructorApprovalStatus; label: string }[] = [
  { value: 'Pending', label: 'در انتظار تایید' },
  { value: 'Approved', label: 'تاییدشده' },
  { value: 'Rejected', label: 'ردشده' },
];

const EMPTY_STATE_TEXT: Record<InstructorApprovalStatus, string> = {
  Pending: 'فعلاً مدرس تازه‌ای در انتظار تایید نیست.',
  Approved: 'هنوز هیچ مدرسی تایید نشده.',
  Rejected: 'هیچ مدرسی رد نشده.',
};

function InstructorApprovalsPage() {
  const {
    status,
    setStatus,
    instructors,
    loading,
    error,
    clearError,
    actioningId,
    handleApprove,
    handleReject,
  } = useInstructorApprovals();

  // تو تب «ردشده» هم دکمه‌ی تایید هست تا ردِ اشتباهی قابل‌برگشت باشه
  const showActions = status !== 'Approved';

  return (
    <AppLayout title="تایید مدرس‌ها">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-white">تایید مدرس‌ها</h1>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              status === tab.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
        {loading ? (
          <Spinner />
        ) : instructors.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="کسی اینجا نیست"
            description={EMPTY_STATE_TEXT[status]}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-right text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2">نام</th>
                  <th className="py-2">ایمیل/شماره</th>
                  <th className="py-2">تاریخ ثبت‌نام</th>
                  {showActions && <th className="py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {instructors.map((instructor) => (
                  <tr
                    key={instructor.id}
                    className="border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 transition duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3">{instructor.name}</td>
                    <td className="py-3 text-gray-400 dark:text-gray-500">
                      {instructor.email || instructor.phone || '—'}
                    </td>
                    <td className="py-3 text-gray-400 dark:text-gray-500">
                      {formatExamDateTime(instructor.createdAt)}
                    </td>
                    {showActions && (
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(instructor.id)}
                            disabled={actioningId === instructor.id}
                            className="rounded-lg bg-success-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-500 transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 size={14} />
                              تایید
                            </span>
                          </button>
                          {status === 'Pending' && (
                            <button
                              onClick={() => handleReject(instructor.id)}
                              disabled={actioningId === instructor.id}
                              className="rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <XCircle size={14} />
                                رد
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default InstructorApprovalsPage;
