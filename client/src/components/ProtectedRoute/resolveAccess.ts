import type { Role, User } from '../../api/authApi';

export type AccessInput = {
  isSessionReady: boolean;
  isSessionUnavailable: boolean;
  user: User | null;
  allowedRoles?: Role[];
  skipOnboardingGate?: boolean;
};

export type AccessDecision =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'redirect'; to: '/login' | '/onboarding' | '/dashboard' }
  | { kind: 'allow' };

// ترتیب مهمه: تا نشست تأیید نشده (loading/unavailable) هیچ تصمیمی بر پایهٔ user
// گرفته نمی‌شه؛ چون user ممکنه از حافظه مونده باشه و هنوز اعتبارسنجی نشده باشه.
// خطای موقت سرویس هم هیچ‌وقت به /login نمی‌رسه.
export function resolveAccess({
  isSessionReady,
  isSessionUnavailable,
  user,
  allowedRoles,
  skipOnboardingGate = false,
}: AccessInput): AccessDecision {
  if (isSessionUnavailable) return { kind: 'unavailable' };
  if (!isSessionReady) return { kind: 'loading' };
  if (!user) return { kind: 'redirect', to: '/login' };
  if (!skipOnboardingGate && !user.onboardingCompleted) return { kind: 'redirect', to: '/onboarding' };
  if (allowedRoles && !allowedRoles.includes(user.role)) return { kind: 'redirect', to: '/dashboard' };
  return { kind: 'allow' };
}