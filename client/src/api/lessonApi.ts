import type { Category } from '../constants/categories';
import { apiRequest } from '../lib/apiClient';

// objectKey/fileUrl(=object key) دیگه لینک قابل‌دسترس مستقیم نیستن - فقط
// شناسه‌ی فایل تو bucket خصوصی هستن. برای پخش/دانلود واقعی باید
// getSessionVideoSignedUrl/getAttachmentSignedUrl صدا زده بشه تا یه لینک
// موقت (چند دقیقه‌ای) گرفته بشه.
export type VideoSource =
  | { type: 'link'; url: string }
  | { type: 'upload'; fileName: string; objectKey: string };

// جزوه/PDF - id فقط برای پیوست‌های موجودی که از سرور اومدن پر می‌شه؛
// پیوست تازه‌آپلودشده (قبل از ذخیره‌ی جلسه) هنوز id نداره
export type Attachment = {
  id?: string;
  fileName: string;
  objectKey: string;
  fileSize: number;
};

export type LessonSession = {
  id: string;
  category: Category;
  groupIds: string[]; // این جلسه به کدوم گروه(ها) تعلق داره
  title: string;
  description: string;
  video: VideoSource;
  attachments: Attachment[];
};

// شکل خروجی سرور (server/src/routes/lessonSessions.ts -> serializeSession)
// دقیقاً همین LessonSession ـه (چهار فیلد پراکنده‌ی video* تو دیتابیس رو
// خودِ سرور به همین یونیون video تبدیل می‌کنه)، پس این فایل فقط یه wrapper
// نازک دور apiRequest ـه.

// بدون groupId: همه‌ی جلساتی که کاربر لاگین‌شده بهشون دسترسی داره (بسته به
// نقش، سمت سرور فیلتر می‌شه)
export function getSessions(): Promise<LessonSession[]> {
  return apiRequest<LessonSession[]>('/lesson-sessions');
}

export function getSessionsByGroupId(
  groupId: string
): Promise<LessonSession[]> {
  return apiRequest<LessonSession[]>(
    `/lesson-sessions?groupId=${encodeURIComponent(groupId)}`
  );
}

export function addSession(
  session: Omit<LessonSession, 'id'>
): Promise<LessonSession> {
  return apiRequest<LessonSession>('/lesson-sessions', {
    method: 'POST',
    body: session,
  });
}

export function updateSession(
  id: string,
  updated: Omit<LessonSession, 'id'>
): Promise<LessonSession> {
  return apiRequest<LessonSession>(`/lesson-sessions/${id}`, {
    method: 'PUT',
    body: updated,
  });
}

export function deleteSession(id: string): Promise<void> {
  return apiRequest<void>(`/lesson-sessions/${id}`, { method: 'DELETE' });
}

// ویدیوی آپلودی/جزوه دیگه با یه URL دائمی سرو نمی‌شن - هر بار که واقعاً
// می‌خوایم پخش/دانلودش کنیم باید یکی از این دوتا رو صدا بزنیم تا یه لینک
// موقت (چند دقیقه‌ای، بعد از چک دسترسی سمت سرور) بگیریم. توابع wrapper
// نازکن؛ منطق اصلی سمت سرور تو routes/lessonSessions.ts ـه.
export function getSessionVideoSignedUrl(sessionId: string): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(`/lesson-sessions/${sessionId}/video/signed-url`);
}

export function getAttachmentSignedUrl(attachmentId: string): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(
    `/lesson-sessions/attachments/${attachmentId}/signed-url`
  );
}
