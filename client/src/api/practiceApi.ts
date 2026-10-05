import { apiRequest } from '../lib/apiClient';
import {
  listQueryString,
  type ListPage,
  type ListQuery,
} from '../lib/listPagination';
import type { QuestionDifficulty } from './questionBankApi';
export type Practice = {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Published' | 'Archived';
  publishedAt: string | null;
  questionCount: number;
  instructorName: string | null;
  groups: { id: string; name: string }[];
};
export type PracticeStats = {
  attempts: number;
  correct: number;
  incorrect: number;
  lastCorrect: boolean | null;
  lastAttemptAt: string | null;
};
export type PracticeQuestion = {
  id: string;
  text: string;
  options: string[];
  difficulty: QuestionDifficulty;
  position: number;
  correctOptionIndex?: number;
  sourceQuestionId?: string | null;
  stats?: PracticeStats;
};
export type PracticeAttempt = {
  id: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  createdAt: string;
};
export type PracticeAnswer = PracticeAttempt & {
  questionId: string;
  correctOptionIndex: number;
  stats: PracticeStats;
};
export type PracticeInput = {
  title: string;
  description: string;
  groupIds: string[];
  questionIds?: string[];
};
export type PracticeFilters = {
  difficulty?: QuestionDifficulty;
  progress?: 'all' | 'unanswered' | 'mistakes';
};
export const getPractices = (query: ListQuery = {}) =>
  apiRequest<ListPage<Practice>>(`/practice${listQueryString(query)}`);
export const getPractice = (id: string) =>
  apiRequest<Practice>(`/practice/${id}`);
export const createPractice = (input: PracticeInput) =>
  apiRequest<{ id: string }>('/practice', { method: 'POST', body: input });
export const updatePractice = (id: string, input: PracticeInput) =>
  apiRequest<{ id: string }>(`/practice/${id}`, { method: 'PUT', body: input });
export const setPracticeStatus = (
  id: string,
  status: 'Published' | 'Archived',
) => apiRequest(`/practice/${id}/status`, { method: 'POST', body: { status } });
export function getPracticeQuestions(
  id: string,
  query: ListQuery = {},
  filters: PracticeFilters = {},
) {
  const params = new URLSearchParams(listQueryString(query).slice(1));
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.progress) params.set('progress', filters.progress);
  return apiRequest<ListPage<PracticeQuestion>>(
    `/practice/${id}/questions?${params}`,
  );
}
export const answerPractice = (
  id: string,
  questionId: string,
  requestId: string,
  selectedOptionIndex: number,
) =>
  apiRequest<PracticeAnswer>(
    `/practice/${id}/questions/${questionId}/answers`,
    { method: 'POST', body: { requestId, selectedOptionIndex } },
  );
export const getPracticeHistory = (
  id: string,
  questionId: string,
  query: ListQuery = {},
) =>
  apiRequest<ListPage<PracticeAttempt>>(
    `/practice/${id}/questions/${questionId}/history${listQueryString(query)}`,
  );
