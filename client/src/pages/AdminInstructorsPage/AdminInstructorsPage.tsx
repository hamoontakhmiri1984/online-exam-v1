import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import DataTable from '../../components/AdminUI/DataTable';
import FilterBar, {
  controlClass,
  LoadError,
} from '../../components/AdminUI/FilterBar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ListPagination from '../../components/ListPagination/ListPagination';
import usePagedList from '../../hooks/usePagedList';
import { getAdminInstructors } from '../../api/adminInstructorApi';
import { userDisplayName } from '../../lib/userDisplayName';
const statuses = {
  Approved: 'تأییدشده',
  Pending: 'در انتظار تأیید',
  Rejected: 'ردشده',
};
export default function AdminInstructorsPage() {
  const [status, setStatus] = useState('');
  const [order, setOrder] = useState('newest');
  const list = usePagedList(
    (q) => getAdminInstructors(q, status, order),
    `${status}:${order}`,
  );
  return (
    <AppLayout title="مدرس‌ها">
      <PageHeader
        title="مدرس‌ها"
        description="مشخصات، وضعیت و محتوای هر مدرس در یک نمای مستقل"
      />
      <FilterBar>
        <select
          aria-label="وضعیت مدرس"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={controlClass}
        >
          <option value="">وضعیت: بدون فیلتر</option>
          {Object.entries(statuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="ترتیب مدرس‌ها"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className={controlClass}
        >
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
          <option value="name">نام مدرس</option>
        </select>
      </FilterBar>
      <ListPagination {...list} maxSearchLength={100} />
      <LoadError message={list.error} retry={list.reload} />
      <DataTable
        items={list.items}
        loading={list.loading}
        columns={[
          {
            key: 'name',
            label: 'مدرس',
            render: (i) => (
              <Link
                className="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
                to={`/instructors/${i.id}`}
              >
                {userDisplayName(i)}
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  {i.organizationName || '—'}
                </span>
              </Link>
            ),
          },
          {
            key: 'contact',
            label: 'اطلاعات تماس',
            render: (i) => <span dir="auto">{i.email || i.phone || '—'}</span>,
          },
          {
            key: 'status',
            label: 'وضعیت',
            render: (i) => (
              <StatusBadge
                tone={
                  i.approvalStatus === 'Approved'
                    ? 'success'
                    : i.approvalStatus === 'Pending'
                      ? 'warning'
                      : 'danger'
                }
              >
                {statuses[i.approvalStatus]}
              </StatusBadge>
            ),
          },
          {
            key: 'students',
            label: 'دانشجویان',
            render: (i) => (i.stats?.students ?? 0).toLocaleString('fa-IR'),
          },
          {
            key: 'groups',
            label: 'گروه‌ها',
            render: (i) => (i.stats?.groups ?? 0).toLocaleString('fa-IR'),
          },
          {
            key: 'exams',
            label: 'آزمون‌ها',
            render: (i) => (i.stats?.exams ?? 0).toLocaleString('fa-IR'),
          },
        ]}
      />
    </AppLayout>
  );
}
