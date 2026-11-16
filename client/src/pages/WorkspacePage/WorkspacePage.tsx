import { useLocation } from 'react-router-dom';
import AppLayout from '../../components/AppLayout/AppLayout';
import { EMPTY_WORKSPACE_PATH } from '../../constants/workspace';
import DashboardPage from '../DashboardPage/DashboardPage';

export default function WorkspacePage() {
  const { pathname } = useLocation();

  if (pathname === EMPTY_WORKSPACE_PATH) {
    return (
      <AppLayout title="پنل">
        <div className="workspace-empty-stage" aria-hidden="true" />
      </AppLayout>
    );
  }

  return <DashboardPage />;
}
