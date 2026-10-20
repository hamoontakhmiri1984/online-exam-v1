import type { Category } from '../constants/categories';
import { apiRequest } from '../lib/apiClient';

// Private files store object keys, not public URLs.
export type VideoSource =
  | { type: 'link'; url: string }
  | { type: 'upload'; fileName: string; objectKey: string };

// New attachments receive an ID only after the lesson is saved.
export type Attachment = {
  id?: string;
  fileName: string;
  objectKey: string;
  fileSize: number;
};

export type LessonSession = {
  id: string;
  category: Category;
  groupIds: string[];
  title: string;
  description: string;
  video: VideoSource;
  attachments: Attachment[];
};

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

// Obtain a fresh signed URL when opening a private file.
export function getSessionVideoSignedUrl(sessionId: string): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(`/lesson-sessions/${sessionId}/video/signed-url`);
}

export function getAttachmentSignedUrl(attachmentId: string): Promise<{ url: string }> {
  return apiRequest<{ url: string }>(
    `/lesson-sessions/attachments/${attachmentId}/signed-url`
  );
}
