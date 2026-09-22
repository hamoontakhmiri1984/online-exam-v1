import { ClipboardList, TrendingUp, Users, type LucideIcon } from 'lucide-react';

type StatsCardsProps = {
  examCount: number;
  studentCount: number;
  showStudentCount: boolean;
  averageScorePercent: number;
  hasAttempts: boolean;
};

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  iconClassName: string;
};

function StatCard({ icon: Icon, label, value, iconClassName }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatsCards({
  examCount,
  studentCount,
  showStudentCount,
  averageScorePercent,
  hasAttempts,
}: StatsCardsProps) {
  return (
    <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={ClipboardList}
        label="آزمون‌های فعال"
        value={examCount.toLocaleString('fa-IR')}
        iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
      />

      {showStudentCount && (
        <StatCard
          icon={Users}
          label="دانشجویان"
          value={studentCount.toLocaleString('fa-IR')}
          iconClassName="bg-accent-500/10 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400"
        />
      )}

      <StatCard
        icon={TrendingUp}
        label="میانگین نمره"
        // بدون هیچ تلاشِ تموم‌شده‌ای «۰٪» گمراه‌کننده‌ست؛ خط تیره نشون می‌دیم
        value={
          hasAttempts ? `${averageScorePercent.toLocaleString('fa-IR')}٪` : '—'
        }
        iconClassName="bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-500"
      />
    </section>
  );
}

export default StatsCards;
