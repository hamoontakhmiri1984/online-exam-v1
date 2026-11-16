import { useState } from 'react';
import { XCircle, Layout, Send, RotateCcw, FolderOpen } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import useAdminSiteContent from '../../hooks/useAdminSiteContent';
import { SITE_CONTENT_SECTIONS, type SiteContentSection } from '../../api/cmsApi';

import HeroSectionForm from './components/HeroSectionForm';
import AboutSectionForm from './components/AboutSectionForm';
import FeaturesSectionForm from './components/FeaturesSectionForm';
import PricingSectionForm from './components/PricingSectionForm';
import NewsSectionForm from './components/NewsSectionForm';
import FooterSectionForm from './components/FooterSectionForm';

const SECTION_LABELS: Record<SiteContentSection, string> = {
  hero: 'Hero',
  about: 'درباره‌ی ما',
  features: 'امکانات',
  pricing: 'تعرفه‌ها',
  news: 'اخبار',
  footer: 'فوتر',
};

function AdminSiteContentPage() {
  const {
    sections,
    loading,
    error,
    clearError,
    savingSection,
    saveSection,
    publishing,
    publish,
  } = useAdminSiteContent();

  const [activeTab, setActiveTab] = useState<SiteContentSection>('hero');
  const [draftRevision, setDraftRevision] = useState(0);
  const [showSavedDraft, setShowSavedDraft] = useState(false);

  function selectSection(section: SiteContentSection) {
    setActiveTab(section);
    setShowSavedDraft(false);
    setDraftRevision(value => value + 1);
  }

  async function saveAndClear(section: SiteContentSection, data: Record<string, unknown>): Promise<boolean> {
    const saved = await saveSection(section, data);
    if (saved) {
      setShowSavedDraft(false);
      setDraftRevision(value => value + 1);
    }
    return saved;
  }

  function loadSavedDraft() {
    setShowSavedDraft(true);
    setDraftRevision(value => value + 1);
  }

  function clearCurrentDraft() {
    // Start with an empty local editor. Never call the API or delete a saved draft.
    setShowSavedDraft(false);
    setDraftRevision(value => value + 1);
  }

  return (
    <AppLayout title="محتوای فرود">
      {error && <div role="alert" className="form-inline-error mb-4 flex items-center justify-between gap-2"><span>{error}</span><button aria-label="بستن خطا" type="button" onClick={clearError}><XCircle size={17}/></button></div>}

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Layout size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">محتوای فرود</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            متنِ هر بخشِ صفحه‌ی فرود رو از همین‌جا ویرایش کن.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-300">ذخیره هر بخش فقط پیش‌نویس را تغییر می‌دهد. تا انتشار را نزنید، صفحه اصلی تغییر نمی‌کند.</p>
        <button type="button" onClick={() => void publish()} disabled={publishing || !!savingSection || loading} className="ui-primary-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          <Send size={16}/>{publishing ? 'در حال انتشار…' : 'انتشار در صفحه اصلی'}
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {SITE_CONTENT_SECTIONS.map((section) => (
          <button
            key={section}
            onClick={() => selectSection(section)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === section
                ? 'bg-brand-600 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {SECTION_LABELS[section]}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <span className="me-auto text-xs text-gray-500 dark:text-gray-400">{showSavedDraft ? 'در حال ویرایش پیش‌نویس ذخیره‌شده' : 'فرم جدید و خالی؛ پیش‌نویس قبلی محفوظ است'}</span>
        <button type="button" disabled={!!savingSection || publishing || loading} onClick={loadSavedDraft} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-400/25 dark:text-violet-200 dark:hover:bg-violet-400/10">
          <FolderOpen size={14}/> بارگذاری پیش‌نویس قبلی
        </button>
        <button type="button" disabled={!!savingSection || publishing || loading} onClick={clearCurrentDraft} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-400/25 dark:text-violet-200 dark:hover:bg-violet-400/10">
          <RotateCcw size={14}/> شروع با فرم خالی
        </button>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
        {loading || !sections ? (
          <Spinner />
        ) : (
          <>
            {activeTab === 'hero' && (
              <HeroSectionForm
                key={`${activeTab}:${draftRevision}`}
                initialData={showSavedDraft ? sections.hero : {}}
                saving={savingSection === 'hero'}
                onSave={(data) => saveAndClear('hero', data)}
              />
            )}
            {activeTab === 'about' && (
              <AboutSectionForm
                key={`${activeTab}:${draftRevision}`}
                initialData={showSavedDraft ? sections.about : {}}
                saving={savingSection === 'about'}
                onSave={(data) => saveAndClear('about', data)}
              />
            )}
            {activeTab === 'features' && (
              <FeaturesSectionForm
                key={`${activeTab}:${draftRevision}`}
                initialData={showSavedDraft ? sections.features : {}}
                saving={savingSection === 'features'}
                onSave={(data) => saveAndClear('features', data)}
              />
            )}
            {activeTab === 'pricing' && (
              <PricingSectionForm
                key={`${activeTab}:${draftRevision}`}
                initialData={showSavedDraft ? sections.pricing : {}}
                saving={savingSection === 'pricing'}
                onSave={(data) => saveAndClear('pricing', data)}
              />
            )}
            {activeTab === 'news' && (
              <NewsSectionForm
                key={`${activeTab}:${draftRevision}`}
                initialData={showSavedDraft ? sections.news : {}}
                saving={savingSection === 'news'}
                onSave={(data) => saveAndClear('news', data)}
              />
            )}
            {activeTab === 'footer' && (
              <FooterSectionForm
                key={`${activeTab}:${draftRevision}`}
                initialData={showSavedDraft ? sections.footer : {}}
                saving={savingSection === 'footer'}
                onSave={(data) => saveAndClear('footer', data)}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default AdminSiteContentPage;
