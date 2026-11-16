import { apiRequest, apiMultipartRequest } from '../lib/apiClient';

// Keep section keys aligned with server validation.
export const SITE_CONTENT_SECTIONS = [
  'hero',
  'about',
  'features',
  'pricing',
  'news',
  'footer',
] as const;

export type SiteContentSection = (typeof SITE_CONTENT_SECTIONS)[number];

// Each section defines its own data shape; consumers supply defaults.
export type SiteContentMap = Record<SiteContentSection, Record<string, unknown>>;

export function getSiteContent(): Promise<{ sections: SiteContentMap }> {
  return apiRequest<{ sections: SiteContentMap }>('/cms');
}

export function getDraftSiteContent(): Promise<{ sections: SiteContentMap }> {
  return apiRequest<{ sections: SiteContentMap }>('/cms/admin/drafts');
}

export function resetSiteContentDraft(section: SiteContentSection): Promise<{ section: string; data: Record<string, unknown> }> {
  return apiRequest(`/cms/admin/drafts/${section}`, { method: 'DELETE' });
}

export function publishSiteContent(): Promise<{ publishedCount: number }> {
  return apiRequest<{ publishedCount: number }>('/cms/admin/publish', { method: 'POST' });
}

export function updateSiteContentSection(
  section: SiteContentSection,
  data: Record<string, unknown>
): Promise<{ section: string; data: Record<string, unknown> }> {
  return apiRequest(`/cms/admin/${section}`, {
    method: 'PUT',
    body: { data },
  });
}

export function uploadSiteContentImage(
  section: SiteContentSection,
  file: File
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiMultipartRequest<{ imageUrl: string }>(
    `/cms/admin/${section}/image`,
    formData,
    { fallbackMessage: (status) => `آپلود تصویر با خطا مواجه شد (${status})` }
  );
}
