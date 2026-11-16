import DashboardPage from '../DashboardPage/DashboardPage';

// The desk is the instructor/admin landing view, not an empty panel.
// AppLayout intentionally keeps /workspace out of the closable tab strip.
export default function WorkspacePage() {
  return <DashboardPage />;
}
