import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import Spinner from '../components/Spinner/Spinner';
import { useAuth } from '../context/AuthContext';
import { routes } from './routeConfig';

function AppRoutes() {
  const { isSessionReady, isSessionUnavailable, retrySession } = useAuth();

  if (isSessionUnavailable) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
        <p>سرویس موقتاً در دسترس نیست. نشست شما حفظ شده؛ چند لحظه بعد دوباره تلاش کنید.</p>
        <button type="button" onClick={retrySession} className="rounded-lg bg-blue-600 px-4 py-2 text-white">
          تلاش مجدد
        </button>
      </div>
    );
  }

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