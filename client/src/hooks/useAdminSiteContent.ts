import { useCallback, useEffect, useState } from 'react';
import {
  getDraftSiteContent,
  publishSiteContent,
  resetSiteContentDraft,
  updateSiteContentSection,
  uploadSiteContentImage,
  type SiteContentMap,
  type SiteContentSection,
} from '../api/cmsApi';
import { ApiError } from '../lib/apiClient';
import { notifySaveError, notifySaveSuccess } from '../components/Toast/Toast';

function useAdminSiteContent() {
  const [sections, setSections] = useState<SiteContentMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [savingSection, setSavingSection] = useState<SiteContentSection | null>(
    null
  );
  const [uploadingSection, setUploadingSection] =
    useState<SiteContentSection | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getDraftSiteContent()
      .then((res) => setSections(res.sections))
      .catch(() => setError('دریافتِ محتوای فرود با خطا مواجه شد'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSection(
    section: SiteContentSection,
    data: Record<string, unknown>
  ): Promise<boolean> {
    setSavingSection(section);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await updateSiteContentSection(section, data);
      // Confirm the write response first; refreshing the draft is a separate request.
      const stored = result.data;
      const matches = Object.entries(data).every(([key, value]) =>
        JSON.stringify(stored[key]) === JSON.stringify(value)
      );
      setSections(previous => previous ? { ...previous, [section]: stored } : previous);
      if (!matches) {
        const message = 'ذخیره تأیید نشد؛ پاسخ سرور با اطلاعات فرم متفاوت است.';
        setError(message);
        notifySaveError(message);
        return false;
      }
      setError(null);
      notifySaveSuccess('پیش‌نویس ذخیره شد؛ برای نمایش در سایت، انتشار را بزنید.');
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'ذخیره‌سازی با خطا مواجه شد';
      setError(message);
      notifySaveError(message);
      return false;
    } finally {
      setSavingSection(null);
    }
  }

  async function resetDraft(section: SiteContentSection): Promise<boolean> {
    setSavingSection(section);
    setError(null);
    setSuccessMessage(null);
    try {
      await resetSiteContentDraft(section);
      const latest = await getDraftSiteContent();
      setSections(latest.sections);
      notifySaveSuccess('پیش‌نویس این بخش پاک شد؛ صفحه اصلی تغییری نکرد.');
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'پاک کردن پیش‌نویس انجام نشد.');
      return false;
    } finally {
      setSavingSection(null);
    }
  }

  const [publishing, setPublishing] = useState(false);
  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const result = await publishSiteContent();
      notifySaveSuccess(result.publishedCount ? 'محتوا با موفقیت در صفحه اصلی منتشر شد.' : 'تغییر تازه‌ای برای انتشار وجود ندارد.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'انتشار انجام نشد؛ دوباره تلاش کنید.');
    } finally {
      setPublishing(false);
    }
  }

  async function uploadImage(
    section: SiteContentSection,
    file: File
  ): Promise<string | null> {
    setUploadingSection(section);
    try {
      const { imageUrl } = await uploadSiteContentImage(section, file);
      return imageUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'آپلودِ تصویر با خطا مواجه شد');
      return null;
    } finally {
      setUploadingSection(null);
    }
  }

  return {
    sections,
    loading,
    error,
    clearError: () => setError(null),
    successMessage,
    clearSuccessMessage: () => setSuccessMessage(null),
    savingSection,
    uploadingSection,
    saveSection,
    resetDraft,
    publishing,
    publish,
    uploadImage,
    refresh: load,
  };
}

export default useAdminSiteContent;
