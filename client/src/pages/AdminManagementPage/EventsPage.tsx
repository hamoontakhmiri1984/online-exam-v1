import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import DataTable from '../../components/AdminUI/DataTable';
import { LoadError } from '../../components/AdminUI/FilterBar';
import ListPagination from '../../components/ListPagination/ListPagination';
import usePagedList from '../../hooks/usePagedList';
import { getReportList, type ReportEvent } from '../../api/adminReportingApi';
import { userDisplayName } from '../../lib/userDisplayName';
const actionLabels: Record<string, string> = {
  'instructor.approve': 'تأیید مدرس',
  'instructor.reject': 'رد درخواست مدرس',
  'instructor.plan_change': 'تغییر اشتراک',
  'approval_policy.update': 'تغییر سیاست تأیید',
  'group.approve': 'تأیید گروه',
  'group.reject': 'رد گروه',
};
export function EventsList({ compact = false }: { compact?: boolean }) {
  const list = usePagedList((q) =>
    getReportList<ReportEvent>('events', compact ? { ...q, pageSize: 5 } : q),
  );
  return (
    <>
      {!compact && <ListPagination {...list} maxSearchLength={100} />}
      <LoadError message={list.error} retry={list.reload} />
      <DataTable
        items={list.items}
        loading={list.loading}
        columns={[
          {
            key: 'admin',
            label: 'کاربر ارشد',
            render: (e) => userDisplayName(e.admin),
          },
          {
            key: 'action',
            label: 'عملیات',
            render: (e) => (
              <span dir="auto">{actionLabels[e.action] || e.action}</span>
            ),
          },
          {
            key: 'target',
            label: 'شناسهٔ مورد',
            render: (e) => (
              <span dir="ltr" className="text-xs">
                {e.targetType} · {e.targetId}
              </span>
            ),
          },
          {
            key: 'date',
            label: 'زمان',
            render: (e) => new Date(e.createdAt).toLocaleString('fa-IR'),
          },
        ]}
      />
    </>
  );
}
export default function EventsPage() {
  return (
    <AppLayout title="رویدادها">
      <PageHeader
        title="رویدادها"
        description="سوابق ثبت‌شدهٔ عملیات مدیریتی؛ این فهرست قابل ویرایش نیست."
      />
      <EventsList />
    </AppLayout>
  );
}
