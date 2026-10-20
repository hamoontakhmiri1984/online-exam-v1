import { apiRequest } from '../lib/apiClient';

export type CategoryStatus = 'Pending' | 'Approved';

export type CategoryOption = {
  id: string;
  name: string;
  status: CategoryStatus;
  proposedById?: string;
  createdAt: string;
};

export function getCategories(): Promise<CategoryOption[]> {
  return apiRequest<CategoryOption[]>('/categories');
}

export function proposeCategory(name: string): Promise<CategoryOption> {
  return apiRequest<CategoryOption>('/categories', {
    method: 'POST',
    body: { name },
  });
}
