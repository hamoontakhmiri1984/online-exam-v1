import { ClipboardList, TrendingUp, Users, Activity } from 'lucide-react';
import { DashboardStatCard } from './DashboardVisuals';

type StatsCardsProps = {
  examCount: number;
  studentCount: number;
  showStudentCount: boolean;
  averageScorePercent: number;
  hasAttempts: boolean;
  attemptCount: number;
};

export default function StatsCards({
  examCount,
  studentCount,
  showStudentCount,
  averageScorePercent,
  hasAttempts,
  attemptCount,
}: StatsCardsProps) {
  return (
    <section
      aria-label="آمار کلی"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <DashboardStatCard
        icon={ClipboardList}
        label="آزمون‌های پیش‌رو"
        value={examCount.toLocaleString('fa-IR')}
        tone="violet"
      />
      <DashboardStatCard
        icon={showStudentCount ? Users : ClipboardList}
        label={showStudentCount ? 'دانشجویان' : 'دفعات شرکت در آزمون'}
        value={(showStudentCount ? studentCount : attemptCount).toLocaleString('fa-IR')}
        tone="cyan"
      />
      <DashboardStatCard
        icon={TrendingUp}
        label="میانگین نمره"
        value={hasAttempts ? `${averageScorePercent.toLocaleString('fa-IR')}٪` : '—'}
        tone="green"
      />
      <DashboardStatCard
        icon={Activity}
        label="کل پاسخ‌های ثبت‌شده"
        value={attemptCount.toLocaleString('fa-IR')}
        tone="amber"
      />
    </section>
  );
}
