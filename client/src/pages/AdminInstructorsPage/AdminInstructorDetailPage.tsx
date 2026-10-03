import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import ListPagination from '../../components/ListPagination/ListPagination';
import Spinner from '../../components/Spinner/Spinner';
import { ApiError } from '../../lib/apiClient';
import usePagedList from '../../hooks/usePagedList';
import { getAdminInstructor, getInstructorContent, type ContentTab, type InstructorSummary } from '../../api/adminInstructorApi';
import InstructorContentList from './components/InstructorContentList';

const tabs: { key: ContentTab; label: string }[] = [
  { key: 'groups', label: 'گروه‌ها' }, { key: 'students', label: 'دانشجوها' },
  { key: 'lessons', label: 'درس‌ها' }, { key: 'handouts', label: 'جزوه‌ها' },
  { key: 'attachments', label: 'پیوست‌های درس' }, { key: 'banks', label: 'بانک سوال' },
  { key: 'questions', label: 'سوال‌ها' }, { key: 'exams', label: 'آزمون‌ها' },
  { key: 'results', label: 'نتایج' },
];
export default function AdminInstructorDetailPage() {
  const { instructorId = '' } = useParams();
  const [profile, setProfile] = useState<InstructorSummary | null>(null);
  const [profileError, setProfileError] = useState('');
  const [tab, setTab] = useState<ContentTab>('groups');
  const [bank, setBank] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let active = true;
    setProfile(null); setProfileError(''); setTab('groups'); setBank(null);
    getAdminInstructor(instructorId)
      .then(result => { if (active) setProfile(result); })
      .catch(error => { if (active) setProfileError(error instanceof ApiError ? error.message : 'دریافت مدرس با خطا مواجه شد'); });
    return () => { active = false; };
  }, [instructorId]);
  const list = usePagedList(
    query => getInstructorContent(instructorId, tab, query, bank?.id),
    `${instructorId}:${tab}:${bank?.id ?? ''}`,
    profile?.id === instructorId,
  );
  const name = profile?.name || profile?.username || profile?.email || instructorId;
  return (
    <AppLayout title="اطلاعات مدرس">
      <Link to="/instructors" className="mb-4 inline-block text-brand-600">بازگشت به مدرس‌ها</Link>
      {profileError ? <p role="alert" className="text-danger-600">{profileError}</p> : !profile || profile.id !== instructorId ? <Spinner /> : (
        <>
          <h1 className="mb-2 text-2xl font-bold dark:text-white">{name}</h1>
          <p className="mb-5 text-sm text-gray-500">{profile.username || profile.email || profile.id} · اطلاعات زیر فقط مربوط به این مدرس است.</p>
          <div role="tablist" aria-label="بخش‌های مدرس" className="mb-5 flex flex-wrap gap-2">
            {tabs.map(item => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key}
              onClick={() => { setTab(item.key); setBank(null); }}
              className={`rounded-lg border px-4 py-2 text-sm ${tab === item.key ? 'bg-brand-600 text-white' : 'dark:text-gray-200'}`}>{item.label}</button>)}
          </div>
          {bank && <p className="mb-3 dark:text-gray-200">بانک: {bank.name} <button type="button" onClick={() => setBank(null)} className="ms-3 text-brand-600">همهٔ سوال‌های این مدرس</button></p>}
          <ListPagination {...list} maxSearchLength={100} />
          {list.error && <p role="alert" className="mb-3 text-danger-600">{list.error}</p>}
          {list.loading ? <Spinner /> : <InstructorContentList items={list.items} tab={tab}
            onOpenBank={selected => { setBank(selected); setTab('questions'); }} />}
        </>
      )}
    </AppLayout>
  );
}
