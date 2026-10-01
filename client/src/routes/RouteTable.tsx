import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import Spinner from '../components/Spinner/Spinner';
import type { RouteConfig } from './routeConfig';

// جدول مسیرها رو رندر می‌کنه. هیچ گیتِ نشستی اینجا نیست: مسیر عمومی فوراً رندر
// می‌شه و فقط ProtectedRoute منتظر تأیید نشست می‌مونه.
function RouteTable({ routeTable }: { routeTable: RouteConfig[] }) {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {routeTable.map(({ path, Component, protected: isProtected, allowedRoles, skipOnboardingGate }) => (
          <Route
            key={path}
            path={path}
            element={
              isProtected ? (
                <ProtectedRoute allowedRoles={allowedRoles} skipOnboardingGate={skipOnboardingGate}>
                  <Component />
                </ProtectedRoute>
              ) : (
                <Component />
              )
            }
          />
        ))}
      </Routes>
    </Suspense>
  );
}

export default RouteTable;