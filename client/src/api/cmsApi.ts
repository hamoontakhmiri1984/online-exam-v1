import { apiRequest, apiMultipartRequest } from '../lib/apiClient';

// همون لیست server/src/validation/cmsSchemas.ts - اینجا هم باید عیناً
// سینک بمونه؛ اضافه‌کردنِ section جدید یعنی هر دو طرف آپدیت بشن
export const SITE_CONTENT_SECTIONS = [
  'hero',
  'about',
  'features',
  'pricing',
  'news',
  'footer',
] as const;

export type SiteContentSection = (typeof SITE_CONTENT_SECTIONS)[number];

// data شکل آزاد داره (هر section شکل خودشو داره) - کامپوننت مصرف‌کننده‌ی هر
// section (مثل Hero.tsx) خودش با یه type محلی و مقدار پیش‌فرض بازش می‌کنه
export type SiteContentMap = Record<SiteContentSection, Record<string, unknown>>;

export function getSiteContent(): Promise<{ sections: SiteContentMap }> {
  return apiRequest<{ sections: SiteContentMap }>('/cms');
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

// multipart، مثل uploadBlogCoverImage تو blogApi.ts - از apiMultipartRequest
// (refresh مشترک + یک بار retry بعد از 401) استفاده می‌کنه
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