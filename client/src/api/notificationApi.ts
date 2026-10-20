import { apiRequest } from '../lib/apiClient';
import type { Role } from './authApi';

export type NotificationIcon = 'info' | 'people' | 'award';

export type Notification = {
  id: string;
  // A missing userId targets all users in targetRoles.
  userId?: string;
  targetRoles?: Role[];
  title: string;
  createdAt: string;
  read: boolean;
  icon: NotificationIcon;
};

export function getNotificationsForUser(
  _userId: string,
  _role: Role
): Promise<Notification[]> {
  return apiRequest<Notification[]>('/notifications');
}

export function markNotificationRead(id: string): void {
  apiRequest<Notification>(`/notifications/${id}/read`, {
    method: 'POST',
  }).catch(() => {
    // Read state is optimistic; a later refresh reconciles failures.
  });
}

export function markAllNotificationsRead(ids: string[]): void {
  if (ids.length === 0) return;

  apiRequest<void>('/notifications/read-all', {
    method: 'POST',
    body: { ids },
  }).catch(() => {
    // Optimistic read state is reconciled on the next refresh.
  });
}

export function deleteNotification(id: string): Promise<void> {
  return apiRequest<void>(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
