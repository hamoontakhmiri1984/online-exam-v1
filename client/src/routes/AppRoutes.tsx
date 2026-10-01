import RouteTable from './RouteTable';
import { routes } from './routeConfig';

// تنها AppRoutes برنامه. بازیابی نشست (loading/unavailable) فقط مسیرهای
// محافظت‌شده رو تحت تأثیر می‌ذاره (ProtectedRoute)، نه صفحات عمومی رو.
function AppRoutes() {
  return <RouteTable routeTable={routes} />;
}

export default AppRoutes;