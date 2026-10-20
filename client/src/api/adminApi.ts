import { apiRequest } from '../lib/apiClient';
import type { CategoryOption, CategoryStatus } from './categoryApi';

export type InstructorApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export type AdminInstructor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  username?: string;
  approvalStatus: InstructorApprovalStatus;
  createdAt: string;
};

export function getInstructorsByStatus(
  status: InstructorApprovalStatus
): Promise<AdminInstructor[]> {
  return apiRequest<AdminInstructor[]>(`/admin/instructors?status=${status}`);
}

export function approveInstructor(id: string): Promise<AdminInstructor> {
  return apiRequest<AdminInstructor>(`/admin/instructors/${id}/approve`, {
    method: 'POST',
  });
}

export function rejectInstructor(id: string): Promise<AdminInstructor> {
  return apiRequest<AdminInstructor>(`/admin/instructors/${id}/reject`, {
    method: 'POST',
  });
}

export function getAdminCategories(
  status?: CategoryStatus
): Promise<CategoryOption[]> {
  const query = status ? `?status=${status}` : '';
  return apiRequest<CategoryOption[]>(`/admin/categories${query}`);
}

export function addCategoryAsAdmin(name: string): Promise<CategoryOption> {
  return apiRequest<CategoryOption>('/admin/categories', {
    method: 'POST',
    body: { name },
  });
}

export function approveCategory(id: string): Promise<CategoryOption> {
  return apiRequest<CategoryOption>(`/admin/categories/${id}/approve`, {
    method: 'POST',
  });
}

export function renameCategory(
  id: string,
  name: string
): Promise<CategoryOption> {
  return apiRequest<CategoryOption>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: { name },
  });
}

export function deleteCategory(id: string): Promise<void> {
  return apiRequest<void>(`/admin/categories/${id}`, { method: 'DELETE' });
}
