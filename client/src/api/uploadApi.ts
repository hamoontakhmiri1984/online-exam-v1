import { apiMultipartRequest } from '../lib/apiClient';

// Uploads return private object keys; playback requires a signed URL.
export type UploadedVideo = { fileName: string; objectKey: string };
export type UploadedAttachment = {
  fileName: string;
  objectKey: string;
  fileSize: number;
};

// Multipart requests share session refresh and retry at most once.
export function uploadLessonVideo(file: File): Promise<UploadedVideo> {
  const formData = new FormData();
  formData.append('video', file);
  return apiMultipartRequest<UploadedVideo>('/uploads/video', formData);
}

export function uploadLessonAttachment(file: File): Promise<UploadedAttachment> {
  const formData = new FormData();
  formData.append('attachment', file);
  return apiMultipartRequest<UploadedAttachment>('/uploads/attachment', formData);
}
