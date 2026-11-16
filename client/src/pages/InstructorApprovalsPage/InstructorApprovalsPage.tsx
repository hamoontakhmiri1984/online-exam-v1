import { useState } from 'react';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

      <div className="mb-7 flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">تایید مدرس‌ها</h1>
      </div>

      <div className="mb-5 inline-flex max-w-full flex-wrap gap-1.5 rounded-2xl border border-violet-200/50 bg-white/65 p-1.5 dark:border-violet-400/15 dark:bg-slate-800/60">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              status === tab.value
                ? 'ui-purple-gradient text-white shadow-sm'
                : 'text-slate-600 hover:bg-violet-50 hover:text-brand-ink dark:text-slate-300 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ui-admin-table overflow-hidden rounded-2xl border border-violet-200/40 bg-white/85 shadow-sm backdrop-blur-xl dark:border-violet-400/15 dark:bg-slate-800/60">
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
                    tabIndex={0}
                    aria-selected={selectedId === instructor.id}
                    onClick={(event) => { if (!(event.target as HTMLElement).closest('button,a,input,select')) setSelectedId(instructor.id); }}
                    onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelectedId(instructor.id); } }}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleApprove(instructor.id)}
                            disabled={actioningId === instructor.id}
                            className="inline-flex h-10 w-28 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-45 dark:text-emerald-300"
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
                              className="inline-flex h-10 w-28 shrink-0 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/5 px-3.5 py-2 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-500/45 hover:bg-rose-500/12 disabled:cursor-not-allowed disabled:opacity-45 dark:text-rose-300"
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
