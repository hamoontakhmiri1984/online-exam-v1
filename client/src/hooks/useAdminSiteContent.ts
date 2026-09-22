import { useCallback, useEffect, useState } from 'react';
import {
  getSiteContent,
  updateSiteContentSection,
  uploadSiteContentImage,
  type SiteContentMap,
  type SiteContentSection,
} from '../api/cmsApi';
import { ApiError } from '../lib/apiClient';

function useAdminSiteContent() {
  const [sections, setSections] = useState<SiteContentMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // فقط section ای که همین الان داره ذخیره/آپلود می‌شه غیرفعال می‌مونه، نه
  // کل صفحه - هم‌الگو با actioningId تو useAdminCategories
  const [savingSection, setSavingSection] = useState<SiteContentSection | null>(
    null
  );
  const [uploadingSection, setUploadingSection] =
    useState<SiteContentSection | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getSiteContent()
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
    try {
      const res = await updateSiteContentSection(section, data);
      setSections((prev) => (prev ? { ...prev, [section]: res.data } : prev));
      setSuccessMessage('ذخیره شد');
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ذخیره‌سازی با خطا مواجه شد');
      return false;
    } finally {
      setSavingSection(null);
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
    uploadImage,
    refresh: load,
  };
}

export default useAdminSiteContent;
