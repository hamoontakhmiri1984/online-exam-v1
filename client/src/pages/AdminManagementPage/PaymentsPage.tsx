import { useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import DataTable from '../../components/AdminUI/DataTable';
import FilterBar, {
  RangeSelect,
  LoadError,
} from '../../components/AdminUI/FilterBar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ListPagination from '../../components/ListPagination/ListPagination';
import usePagedList from '../../hooks/usePagedList';
import { getReportList, type ReportPayment } from '../../api/adminReportingApi';
import { userDisplayName } from '../../lib/userDisplayName';
import { PLANS } from '../../constants/plans';
const statuses = {
  Pending: 'در انتظار پرداخت',
  Success: 'موفق',
  Failed: 'ناموفق',
  Refunded: 'بازپرداخت‌شده',
};
export default function PaymentsPage() {
  const [days, setDays] = useState(30);
  const list = usePagedList(
    (q) => getReportList<ReportPayment>('payments', q, days),
    String(days),
  );
  return (
    <AppLayout title="پرداخت‌ها">
      <PageHeader
        title="پرداخت‌ها"
        description="سوابق پرداخت مدرس‌ها؛ مرتب‌شده بر اساس زمان ایجاد پرداخت"
      />
      <FilterBar>
        <RangeSelect days={days} onChange={setDays} />
      </FilterBar>
      <ListPagination {...list} maxSearchLength={100} />
      <LoadError message={list.error} retry={list.reload} />
      <DataTable
        items={list.items}
        loading={list.loading}
        columns={[
          {
            key: 'user',
            label: 'مدرس',
            render: (p) => userDisplayName(p.instructor),
          },
          { key: 'plan', label: 'اشتراک', render: (p) => PLANS[p.planId].name },
          {
            key: 'amount',
            label: 'مبلغ (تومان)',
            render: (p) => p.amount.toLocaleString('fa-IR'),
          },
          {
            key: 'status',
            label: 'وضعیت',
            render: (p) => (
              <StatusBadge
                tone={
                  p.status === 'Success'
                    ? 'success'
                    : p.status === 'Failed'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {statuses[p.status]}
              </StatusBadge>
            ),
          },
          {
            key: 'date',
            label: 'تاریخ',
            render: (p) => new Date(p.createdAt).toLocaleString('fa-IR'),
          },
        ]}
      />
    </AppLayout>
  );
}
