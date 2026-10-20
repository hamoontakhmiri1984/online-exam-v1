import type { Category } from '../constants/categories';
import { apiRequest, ApiError } from '../lib/apiClient';

export type Exam = {
  instructor?: { id: string; name: string | null; username: string | null };
  id: string;
  title: string;
  category: Category;
  groupIds: string[];
  date: string;
  participants: number;
  status: 'draft' | 'completed' | 'upcoming';
  durationMinutes: number;
  allowReview: boolean;
};

type ExamWriteBody = {
  title: string;
  category: Category;
  groupIds: string[];
  scheduledAt: string;
  durationMinutes: number;
  allowReview: boolean;
};

function toWriteBody(exam: Omit<Exam, 'id'>): ExamWriteBody {
  return {
    title: exam.title,
    category: exam.category,
    groupIds: exam.groupIds,
    scheduledAt: exam.date,
    durationMinutes: exam.durationMinutes,
    allowReview: exam.allowReview,
  };
}

export function getExams(): Promise<Exam[]> {
  return apiRequest<Exam[]>('/exams');
}

export async function getExamById(id: string): Promise<Exam | undefined> {
  try {
    return await apiRequest<Exam>(`/exams/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return undefined;
    }
    throw err;
  }
}

export function addExam(exam: Omit<Exam, 'id'>): Promise<Exam> {
  return apiRequest<Exam>('/exams', {
    method: 'POST',
    body: toWriteBody(exam),
  });
}

export function updateExam(
  id: string,
  updated: Omit<Exam, 'id'>
): Promise<Exam> {
  return apiRequest<Exam>(`/exams/${id}`, {
    method: 'PUT',
    body: toWriteBody(updated),
  });
}

export function deleteExam(id: string): Promise<void> {
  return apiRequest<void>(`/exams/${id}`, { method: 'DELETE' });
}

// Publishing requires at least one question.
export function publishExam(id: string): Promise<Exam> {
  return apiRequest<Exam>(`/exams/${id}/publish`, { method: 'POST' });
}

// Unpublishing is forbidden once an attempt starts.
export function unpublishExam(id: string): Promise<Exam> {
  return apiRequest<Exam>(`/exams/${id}/unpublish`, { method: 'POST' });
}
