import RouteTable from './RouteTable';
import { routes } from './routeConfig';

function AppRoutes() {
  return <RouteTable routeTable={routes} />;
}

export default AppRoutes;