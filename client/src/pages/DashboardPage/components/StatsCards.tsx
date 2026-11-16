import { ClipboardList, TrendingUp, Users } from 'lucide-react';
import { DashboardStatCard } from './DashboardVisuals';
type StatsCardsProps = {
  examCount: number; studentCount: number; showStudentCount: boolean;
  averageScorePercent: number; hasAttempts: boolean;
};
export default function StatsCards({ examCount, studentCount, showStudentCount, averageScorePercent, hasAttempts }: StatsCardsProps) {
  return (
    <section className="glass-unified-stats mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardStatCard icon={ClipboardList} label="آزمون‌های فعال" value={examCount.toLocaleString('fa-IR')} tone="violet" />
      {showStudentCount && <DashboardStatCard icon={Users} label="دانشجویان" value={studentCount.toLocaleString('fa-IR')} tone="cyan" />}
      <DashboardStatCard icon={TrendingUp} label="میانگین نمره" value={hasAttempts ? `${averageScorePercent.toLocaleString('fa-IR')}٪` : '—'} tone="green" />
    </section>
  );
}
