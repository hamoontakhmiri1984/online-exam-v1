import PanelBack from '../../components/PanelBack/PanelBack';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import LearningPageLayout from '../../components/LearningPageLayout/LearningPageLayout';
import { GraduationCap } from 'lucide-react';
import ListPagination from '../../components/ListPagination/ListPagination';
import Spinner from '../../components/Spinner/Spinner';
import { ApiError } from '../../lib/apiClient';
import usePagedList from '../../hooks/usePagedList';
import { getAdminInstructor, getInstructorContent, type ContentTab, type InstructorSummary } from '../../api/adminInstructorApi';
import InstructorContentList from './components/InstructorContentList';
import { instructorTabs as tabs, parseInstructorTab } from './instructorTabs';

export default function AdminInstructorDetailPage() {
  const { instructorId = '' } = useParams();
  const [profile, setProfile] = useState<InstructorSummary | null>(null);
  const [profileError, setProfileError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseInstructorTab(searchParams.get('tab'));
  const setTab = (next: ContentTab) => setSearchParams({ tab: next }, { replace: true });
  const [bank, setBank] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let active = true;
    setProfile(null); setProfileError(''); setBank(null);
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
      {profileError ? <p role="alert" className="text-danger-600">{profileError}</p> : !profile || profile.id !== instructorId ? <Spinner /> : (
        <LearningPageLayout
          eyebrow="مدیریت آموزشی"
          title={name}
          description={`${profile.username || profile.email || profile.id} · اطلاعات اختصاصی این مدرس را در بخش‌های زیر مشاهده کنید.`}
          icon={GraduationCap}
          actions={<PanelBack to="/instructors" label="بازگشت به فهرست مدرس‌ها" />}
        >
          <div role="tablist" aria-label="بخش‌های مدرس" className="mb-5 flex flex-wrap gap-2">
            {tabs.map(item => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key}
              onClick={() => { setTab(item.key); setBank(null); }}
              className={`rounded-lg border px-4 py-2 text-sm ${tab === item.key ? 'bg-brand-600 text-white' : 'dark:text-gray-200'}`}>{item.label}</button>)}
          </div>
          {bank && <p className="mb-3 dark:text-gray-200">بانک: {bank.name} <button type="button" onClick={() => setBank(null)} className="ms-3 text-brand-ink">همهٔ سوال‌های این مدرس</button></p>}
          <ListPagination {...list} maxSearchLength={100} />
          {list.error && <p role="alert" className="mb-3 text-danger-600">{list.error}</p>}
          {list.loading ? <Spinner /> : <InstructorContentList items={list.items} tab={tab}
            onOpenBank={selected => { setBank(selected); setTab('questions'); }} />}
        </LearningPageLayout>
      )}
    </AppLayout>
  );
}
