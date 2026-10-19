import InstructorFilter from '../../components/AdminUI/InstructorFilter';
import { useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import DataTable from '../../components/AdminUI/DataTable';
import FilterBar, {
  RangeSelect,
  LoadError,
  controlClass,
} from '../../components/AdminUI/FilterBar';
import ReportOverview from '../../components/AdminUI/ReportOverview';
import ListPagination from '../../components/ListPagination/ListPagination';
import usePagedList from '../../hooks/usePagedList';
import { getReportList, type ReportAttempt } from '../../api/adminReportingApi';
import { userDisplayName } from '../../lib/userDisplayName';
export default function ReportsPage() {
  const [instructorId, setInstructorId] = useState('');
  const [days, setDays] = useState(30);
  const [order, setOrder] = useState('newest');
  const list = usePagedList(
    (q) =>
      getReportList<ReportAttempt>('attempts', q, days, order, instructorId),
    `${days}:${order}:${instructorId}`,
  );
  return (
    <AppLayout title="گزارش‌ها">
      <PageHeader
        title="گزارش‌ها"
        description="عملکرد آموزشی و فعالیت سامانه در بازهٔ انتخاب‌شده"
      />
      <FilterBar>
        <RangeSelect days={days} onChange={setDays} />
        <InstructorFilter value={instructorId} onChange={setInstructorId} />
        {instructorId && (
          <button
            type="button"
            className="text-sm text-brand-600"
            onClick={() => setInstructorId('')}
          >
            حذف فیلتر مدرس
          </button>
        )}
      </FilterBar>
      <ReportOverview
        key={`${days}:${instructorId}`}
        days={days}
        instructorId={instructorId}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold dark:text-white">
          نتایج آزمون‌ها
        </h2>
        <select
          aria-label="ترتیب نتایج"
          className={controlClass}
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
        </select>
      </div>
      <ListPagination {...list} maxSearchLength={100} />
      <LoadError message={list.error} retry={list.reload} />
      <DataTable
        items={list.items}
        loading={list.loading}
        columns={[
          {
            key: 'student',
            label: 'دانشجو',
            render: (a) => userDisplayName(a.student),
          },
          { key: 'exam', label: 'آزمون', render: (a) => a.exam.title },
          {
            key: 'owner',
            label: 'مدرس',
            render: (a) =>
              a.exam.instructor
                ? userDisplayName(a.exam.instructor)
                : 'مدرس حذف‌شده',
          },
          {
            key: 'score',
            label: 'پاسخ صحیح',
            render: (a) =>
              `${a.correctCount.toLocaleString('fa-IR')} از ${a.totalQuestions.toLocaleString('fa-IR')}`,
          },
          {
            key: 'date',
            label: 'تکمیل',
            render: (a) => new Date(a.finishedAt).toLocaleString('fa-IR'),
          },
        ]}
      />
    </AppLayout>
  );
}
