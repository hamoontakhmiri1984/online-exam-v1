import { apiRequest } from '../lib/apiClient';
import type { CategoryOption, CategoryStatus } from './categoryApi';

// شکل خروجی سرور دقیقاً معادل serializeInstructor تو
// server/src/routes/admin.ts ـه. این روت‌ها فقط برای SuperAdmin مجازن
// (سرور خودش هم requireRole('SuperAdmin') رو چک می‌کنه).

export type InstructorApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export type AdminInstructor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  username?: string;
  approvalStatus: InstructorApprovalStatus;
  createdAt: string; // ISO timestamp
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

// شکل خروجی سرور دقیقاً معادل serializeCategory تو
// server/src/lib/categories.ts ـه. این روت‌ها فقط برای SuperAdmin مجازن.

// status اختیاریه - بدونِ اون سرور همه رو برمی‌گردونه (تبِ «همه» تو پنل)
export function getAdminCategories(
  status?: CategoryStatus
): Promise<CategoryOption[]> {
  const query = status ? `?status=${status}` : '';
  return apiRequest<CategoryOption[]>(`/admin/categories${query}`);
}

// اضافه‌کردنِ مستقیم توسط ادمین - همون لحظه Approved می‌شه
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

// تغییرِ نام - سرور خودش cascade می‌زنه رویِ گروه/آزمون/جلسه‌هایی که ازش
// استفاده کردن
export function renameCategory(
  id: string,
  name: string
): Promise<CategoryOption> {
  return apiRequest<CategoryOption>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: { name },
  });
}

// رد کردنِ Pending یا حذفِ Approved (اگه دیگه جایی استفاده نشه - وگرنه
// سرور 409 برمی‌گردونه)
export function deleteCategory(id: string): Promise<void> {
  return apiRequest<void>(`/admin/categories/${id}`, { method: 'DELETE' });
}
