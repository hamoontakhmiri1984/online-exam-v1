import { apiMultipartRequest } from '../lib/apiClient';

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

// آپلودها multipart هستن و از apiMultipartRequest (apiClient.ts) رد می‌شن:
// همون refresh مشترک و «یک بار retry بعد از 401»، و Content-Type (با boundary
// درست) رو خود مرورگر می‌سازه.
export function uploadLessonVideo(file: File): Promise<UploadedVideo> {
  const formData = new FormData();
  formData.append('video', file);
  return apiMultipartRequest<UploadedVideo>('/uploads/video', formData);
}

// همون منطق uploadLessonVideo، برای جزوه/PDF - endpoint و فیلد فرم فرق می‌کنن
export function uploadLessonAttachment(file: File): Promise<UploadedAttachment> {
  const formData = new FormData();
  formData.append('attachment', file);
  return apiMultipartRequest<UploadedAttachment>('/uploads/attachment', formData);
}