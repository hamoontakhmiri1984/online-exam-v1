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

// Do not trust cached users before session validation; temporary failures must not redirect to login.
export function resolveAccess({
  isSessionReady,
  isSessionUnavailable,
  user,
  allowedRoles,
}: AccessInput): AccessDecision {
  if (isSessionUnavailable) return { kind: 'unavailable' };
  if (!isSessionReady) return { kind: 'loading' };
  if (!user) return { kind: 'redirect', to: '/login' };
  if (allowedRoles && !allowedRoles.includes(user.role)) return { kind: 'redirect', to: '/dashboard' };
  return { kind: 'allow' };
}
