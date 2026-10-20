import { apiRequest } from '../lib/apiClient';
import { listQueryString, type ListPage, type ListQuery } from '../lib/listPagination';

export type AdminStudent = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  instructors: {
    id: string;
    name: string;
    groups: { id: string; name: string; category: string }[];
  }[];
};

// Instructor and ungrouped filters are mutually exclusive.
export type AdminStudentFilter = { instructorId?: string; ungrouped?: boolean };

export function getAdminStudents(
  query: ListQuery,
  filter: AdminStudentFilter = {},
  order = ''
): Promise<ListPage<AdminStudent>> {
  const suffix = filter.ungrouped
    ? '&ungrouped=true'
    : filter.instructorId
      ? `&instructorId=${encodeURIComponent(filter.instructorId)}`
      : '';
  return apiRequest(`/admin/users/students${listQueryString(query)}${suffix}${order ? `&order=${encodeURIComponent(order)}` : ''}`);
}

export const UNGROUPED_SELECTION = '__ungrouped';

export function filterFromSelection(value: string): AdminStudentFilter {
  if (value === UNGROUPED_SELECTION) return { ungrouped: true };
  return value ? { instructorId: value } : {};
}
