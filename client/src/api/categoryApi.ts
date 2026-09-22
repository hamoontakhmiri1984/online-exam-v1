import { apiRequest } from '../lib/apiClient';

export type CategoryStatus = 'Pending' | 'Approved';

export type CategoryOption = {
  id: string;
  name: string;
  status: CategoryStatus;
  proposedById?: string;
  createdAt: string; // ISO timestamp
};

// دسته‌بندی‌های قابل‌دیدنِ کاربرِ لاگین‌شده: همه‌ی Approved + Pendingِ خودش
// (سرور خودش فیلترش می‌کنه - GET /categories تو server/src/routes/categories.ts)
export function getCategories(): Promise<CategoryOption[]> {
  return apiRequest<CategoryOption[]>('/categories');
}

// پیشنهادِ دسته‌بندیِ جدید. idempotent‌ـه - اگه از قبل (با همون نام،
// case-insensitive) وجود داشته باشه سرور همون رو برمی‌گردونه، نه یه
// دوپلیکیت
export function proposeCategory(name: string): Promise<CategoryOption> {
  return apiRequest<CategoryOption>('/categories', {
    method: 'POST',
    body: { name },
  });
}
