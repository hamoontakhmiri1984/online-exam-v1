import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import SessionUnavailable from '../SessionStatus/SessionUnavailable';
import Spinner from '../Spinner/Spinner';
import { resolveAccess } from './resolveAccess';

type ProtectedRouteProps = { children: ReactNode; allowedRoles?: Role[]; skipOnboardingGate?: boolean; };

function ProtectedRoute({ children, allowedRoles, skipOnboardingGate = false }: ProtectedRouteProps) {
  const { user, isSessionReady, isSessionUnavailable, retrySession } = useAuth();
  const decision = resolveAccess({ isSessionReady, isSessionUnavailable, user, allowedRoles, skipOnboardingGate });
  switch (decision.kind) {
    case 'unavailable':
      return <SessionUnavailable onRetry={retrySession} />;
    case 'loading':
      return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
    case 'redirect':
      return <Navigate to={decision.to} replace />;
    default:
      return <>{children}</>;
  }
}
export default ProtectedRoute;