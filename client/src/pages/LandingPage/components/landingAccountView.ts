import type { User } from '../../../api/authApi';

export type LandingAccountView =
  | { status: 'guest' }
  | {
      status: 'authenticated';
      user: User;
      displayName: string;
      roleName: string;
      dashboardPath: '/workspace' | '/dashboard';
    };

export function getLandingAccountView({
  user,
  isSessionReady,
}: {
  user: User | null;
  isSessionReady: boolean;
  isSessionUnavailable?: boolean;
}): LandingAccountView {
  // The public site always shows guest buttons until a login is confirmed.
  // Connection outages and loading states must never block those buttons.
  if (!isSessionReady || !user) return { status: 'guest' };

  const roleName = {
    SuperAdmin: 'کاربر ارشد',
    Instructor: 'مدرس',
    Student: 'دانشجو',
  }[user.role];

  return {
    status: 'authenticated',
    user,
    displayName: user.name?.trim() || user.username?.trim() || 'کاربر',
    roleName,
    dashboardPath: user.role === 'Student' ? '/dashboard' : '/workspace',
  };
}
