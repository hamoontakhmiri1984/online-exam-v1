import { apiRequest } from '../lib/apiClient';
import { listQueryString, type ListPage, type ListQuery } from '../lib/listPagination';
import type { InstructorApprovalStatus } from './adminApi';

export type InstructorSummary = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  organizationName: string | null;
  approvalStatus: InstructorApprovalStatus;
  stats?: { groups: number; students: number; lessons: number; banks: number; exams: number; handouts: number };
  plan?: { planId: string; startDate: string | null; endDate: string | null };
};
export type ContentTab = 'groups' | 'students' | 'lessons' | 'handouts' | 'attachments' | 'banks' | 'questions' | 'exams' | 'results';
export type ContentItem = {
  id: string;
  name?: string | null;
  title?: string;
  text?: string;
  username?: string | null;
  category?: string;
  status?: string;
  difficulty?: string;
  joinCode?: string;
  fileName?: string;
  fileSize?: number;
  groups?: { id: string; name: string }[];
  group?: { id: string; name: string } | null;
  bank?: { id: string; name: string };
  session?: { id: string; title: string; groups: { id: string; name: string }[] };
  options?: string[];
  correctOptionIndex?: number;
  correctCount?: number;
  totalQuestions?: number;
  finishedAt?: string | null;
  exam?: { id: string; title: string };
  student?: { id: string; name: string | null };
  _count?: { students?: number; exams?: number; questions?: number; attachments?: number; attempts?: number };
};
const base = '/admin/users/instructors';
export function getAdminInstructors(query: ListQuery, status = ''): Promise<ListPage<InstructorSummary>> {
  const suffix = status ? `&status=${encodeURIComponent(status)}` : '';
  return apiRequest(`${base}${listQueryString(query)}${suffix}`);
}
export function getAdminInstructor(id: string): Promise<InstructorSummary> {
  return apiRequest(`${base}/${encodeURIComponent(id)}`);
}
export function getInstructorContent(id: string, tab: ContentTab, query: ListQuery, bankId = ''): Promise<ListPage<ContentItem>> {
  const suffix = tab === 'questions' && bankId ? `&bankId=${encodeURIComponent(bankId)}` : '';
  return apiRequest(`${base}/${encodeURIComponent(id)}/${tab}${listQueryString(query)}${suffix}`);
}
