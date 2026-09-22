import { XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Toast from '../../components/Toast/Toast';
import ProgressChart from '../../components/ProgressChart/ProgressChart';
import TodayExamsChart from '../../components/TodayExamsChart/TodayExamsChart';
import DashboardHeader from './components/DashboardHeader';
import StatsCards from './components/StatsCards';
import RecentExamsTable from './components/RecentExamsTable';
import useDashboardData from './useDashboardData';
import {
  buildAverageScorePercent,
  buildProgressData,
  buildRecentExams,
  buildTopExamsData,
  countParticipants,
} from './Dashboard.utils';

// این صفحه دیگه خودش منطقی نداره: فچ/فیلتر توی useDashboardData، محاسبات آماری
// و آماده‌سازی داده‌ی چارت‌ها توی dashboard.utils، و UI توی components/ هستن.
function DashboardPage() {
  const { user, exams, attempts, studentCount, error, clearError } =
    useDashboardData();

  const getParticipantCount = (examId: string) =>
    countParticipants(attempts, examId);

  const averageScorePercent = buildAverageScorePercent(attempts);
  const recentExams = buildRecentExams(exams);
  const topExamsData = buildTopExamsData(exams, attempts);
  const progressData = buildProgressData(attempts);

  return (
    <AppLayout title={user?.role === 'Student' ? 'داشبورد' : 'داشبورد مدیریتی'}>
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}

      <DashboardHeader user={user} />

      <StatsCards
        // «فعال» یعنی پیش‌رو؛ قبلاً همه‌ی آزمون‌ها (حتی پایان‌یافته و
        // پیش‌نویس) شمرده می‌شدن
        examCount={exams.filter((e) => e.status === 'upcoming').length}
        studentCount={studentCount}
        showStudentCount={user?.role !== 'Student'}
        averageScorePercent={averageScorePercent}
        hasAttempts={attempts.length > 0}
      />

      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TodayExamsChart data={topExamsData} />
        <ProgressChart data={progressData} />
      </section>

      <RecentExamsTable
        exams={recentExams}
        getParticipantCount={getParticipantCount}
      />
    </AppLayout>
  );
}

export default DashboardPage;
