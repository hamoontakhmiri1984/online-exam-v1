import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import ListPagination from '../../components/ListPagination/ListPagination';
import Spinner from '../../components/Spinner/Spinner';
import usePagedList from '../../hooks/usePagedList';
import { getAdminInstructors } from '../../api/adminInstructorApi';

export default function AdminInstructorsPage() {
  const [status, setStatus] = useState('');
  const list = usePagedList(query => getAdminInstructors(query, status), status);
  return (
    <AppLayout title="مدرس‌ها">
      <h1 className="mb-2 text-2xl font-bold dark:text-white">مدرس‌ها</h1>
      <p className="mb-5 text-sm text-gray-500">برای مشاهدهٔ گروه‌ها، درس‌ها، فایل‌ها، سوال‌ها و آزمون‌ها، مدرس را انتخاب کن.</p>
      <div className="mb-4 flex gap-3">
        <select aria-label="وضعیت مدرس" value={status} onChange={event => setStatus(event.target.value)}
          className="rounded border bg-transparent px-3 py-2 dark:text-gray-200">
          <option value="">همهٔ مدرس‌ها</option>
          <option value="Approved">تأییدشده</option>
          <option value="Pending">در انتظار تأیید</option>
          <option value="Rejected">ردشده</option>
        </select>
        <Link to="/instructor-students" className="text-brand-600">نمای دانشجوها</Link>
      </div>
      <ListPagination {...list} maxSearchLength={100} />
      {list.error && <p role="alert" className="mb-3 text-danger-600">{list.error}</p>}
      {list.loading ? <Spinner /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.items.map(instructor => (
            <Link key={instructor.id} to={`/instructors/${instructor.id}`}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <h2 className="font-bold">{instructor.name || instructor.username || instructor.email || instructor.id}</h2>
              <p className="mt-2 text-sm text-gray-500">{instructor.username || instructor.email || instructor.phone || instructor.id}</p>
              <p className="my-2 text-sm text-gray-500">{instructor.organizationName || 'بدون نام مجموعه'}</p>
              <p className="text-sm">{instructor.stats?.groups ?? 0} گروه · {instructor.stats?.students ?? 0} دانشجو · {instructor.stats?.banks ?? 0} بانک · {instructor.stats?.exams ?? 0} آزمون</p>
              <span className="mt-3 block text-sm text-brand-600">مشاهدهٔ اطلاعات این مدرس</span>
            </Link>
          ))}
          {!list.items.length && <p className="text-gray-500">مدرسی با این شرایط پیدا نشد.</p>}
        </div>
      )}
    </AppLayout>
  );
}
