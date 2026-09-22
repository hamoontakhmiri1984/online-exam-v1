import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import Spinner from '../components/Spinner/Spinner';
import { useAuth } from '../context/AuthContext';
import { routes } from './routeConfig';

function AppRoutes() {
  const { isSessionReady } = useAuth();

  if (!isSessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {routes.map(
          ({
            path,
            Component,
            protected: isProtected,
            allowedRoles,
            skipOnboardingGate,
          }) => (
            <Route
              key={path}
              path={path}
              element={
                isProtected ? (
                  <ProtectedRoute
                    allowedRoles={allowedRoles}
                    skipOnboardingGate={skipOnboardingGate}
                  >
                    <Component />
                  </ProtectedRoute>
                ) : (
                  <Component />
                )
              }
            />
          )
        )}
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
