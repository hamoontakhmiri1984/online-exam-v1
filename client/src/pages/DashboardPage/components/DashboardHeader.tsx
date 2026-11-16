import type { User } from '../../../api/authApi';
import { DashboardWelcome } from './DashboardVisuals';
export default function DashboardHeader({ user }: { user: User | null }) {
  return <DashboardWelcome name={user?.name || user?.username || 'کاربر'} description="امروز وضعیت آزمون‌هایت را اینجا می‌بینی" />;
}
