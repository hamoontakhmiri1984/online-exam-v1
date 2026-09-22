import { apiRequest, ApiError, getAuthToken, API_BASE_URL } from '../lib/apiClient';

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

// multipart، مثل uploadBlogCoverImage تو blogApi.ts
export async function uploadSiteContentImage(
  section: SiteContentSection,
  file: File
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/cms/admin/${section}/image`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'اتصال به سرور برقرار نشد');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error)
        : null) ?? `آپلود تصویر با خطا مواجه شد (${response.status})`;
    throw new ApiError(response.status, message, data);
  }
  return data as { imageUrl: string };
}
