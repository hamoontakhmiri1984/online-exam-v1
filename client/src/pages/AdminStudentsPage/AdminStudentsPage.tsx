import { useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import DataTable from '../../components/AdminUI/DataTable';
import FilterBar, {
  controlClass,
  LoadError,
} from '../../components/AdminUI/FilterBar';
import InstructorFilter from '../../components/AdminUI/InstructorFilter';
import ListPagination from '../../components/ListPagination/ListPagination';
import usePagedList from '../../hooks/usePagedList';
import { userDisplayName } from '../../lib/userDisplayName';
import {
  UNGROUPED_SELECTION,
  filterFromSelection,
  getAdminStudents,
} from '../../api/adminStudentApi';
export default function AdminStudentsPage() {
  const [selection, setSelection] = useState('');
  const [order, setOrder] = useState('newest');
  const list = usePagedList(
    (q) => getAdminStudents(q, filterFromSelection(selection), order),
    `${selection}:${order}`,
  );
  return (
    <AppLayout title="دانشجویان">
      <PageHeader
        title="دانشجویان"
        description="مشاهدهٔ عضویت دانشجویان در گروه‌ها، به تفکیک مدرس"
      />
      <FilterBar>
        <InstructorFilter
          value={selection === UNGROUPED_SELECTION ? '' : selection}
          onChange={setSelection}
        />
        <button
          type="button"
          className={controlClass}
          aria-pressed={selection === UNGROUPED_SELECTION}
          onClick={() => setSelection(UNGROUPED_SELECTION)}
        >
          بدون گروه
        </button>
        {selection && (
          <button
            type="button"
            onClick={() => setSelection('')}
            className="text-sm text-brand-600"
          >
            حذف فیلتر
          </button>
        )}
        <select
          aria-label="ترتیب دانشجویان"
          className={controlClass}
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
          <option value="name">نام دانشجو</option>
        </select>
      </FilterBar>
      <ListPagination {...list} maxSearchLength={100} />
      <LoadError message={list.error} retry={list.reload} />
      <DataTable
        items={list.items}
        loading={list.loading}
        columns={[
          { key: 'name', label: 'دانشجو', render: (s) => userDisplayName(s) },
          {
            key: 'contact',
            label: 'اطلاعات تماس',
            render: (s) => <span dir="auto">{s.email || s.phone || '—'}</span>,
          },
          {
            key: 'groups',
            label: 'مدرس و گروه‌ها',
            render: (s) =>
              s.instructors.length ? (
                <ul className="space-y-2">
                  {s.instructors.map((i) => (
                    <li key={i.id}>
                      <span className="font-medium">
                        {i.name || 'بدون نام'}
                      </span>
                      <span className="text-gray-500">
                        {' '}
                        — {i.groups.map((g) => g.name).join('، ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-gray-500">بدون گروه</span>
              ),
          },
        ]}
      />
    </AppLayout>
  );
}
