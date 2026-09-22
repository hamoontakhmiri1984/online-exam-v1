import { ApiError, getAuthToken } from '../lib/apiClient';

// آدرس بک‌اند - همون چیزی که apiClient.ts هم استفاده می‌کنه
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000';

// دیگه سرور یه URL دائمی قابل‌دسترس برنمی‌گردونه (فایل تو bucket خصوصیه) -
// فقط object key رو برمی‌گردونه که باید بعداً موقع نمایش، با
// getSessionVideoSignedUrl/getAttachmentSignedUrl (تو lessonApi.ts) به یه
// لینک موقت (signed URL) تبدیل بشه.
export type UploadedVideo = { fileName: string; objectKey: string };
export type UploadedAttachment = {
  fileName: string;
  objectKey: string;
  fileSize: number;
};

// این تابع از apiRequest تو apiClient.ts استفاده نمی‌کنه چون اون همیشه بدنه
// رو JSON.stringify می‌کنه و Content-Type: application/json می‌ذاره - برای
// آپلود فایل باید FormData/multipart بفرستیم و بذاریم خود مرورگر
// Content-Type (با boundary درست) رو بسازه
export async function uploadLessonVideo(file: File): Promise<UploadedVideo> {
  const formData = new FormData();
  formData.append('video', file);

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/uploads/video`, {
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
        : null) ?? `آپلود با خطا مواجه شد (${response.status})`;
    throw new ApiError(response.status, message, data);
  }

  return data as UploadedVideo;
}

// همون منطق uploadLessonVideo، برای جزوه/PDF - endpoint و فیلد فرم فرق
// می‌کنن، بقیه (هدر Authorization، مدیریت خطا) یکیه
export async function uploadLessonAttachment(
  file: File
): Promise<UploadedAttachment> {
  const formData = new FormData();
  formData.append('attachment', file);

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/uploads/attachment`, {
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
        : null) ?? `آپلود با خطا مواجه شد (${response.status})`;
    throw new ApiError(response.status, message, data);
  }

  return data as UploadedAttachment;
}
