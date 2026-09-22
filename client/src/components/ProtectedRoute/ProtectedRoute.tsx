import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
type ProtectedRouteProps = { children: ReactNode; allowedRoles?: Role[]; skipOnboardingGate?: boolean; };
function ProtectedRoute({ children, allowedRoles, skipOnboardingGate = false }: ProtectedRouteProps) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!skipOnboardingGate && !user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
export default ProtectedRoute;
