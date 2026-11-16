import { useLocation } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import useGroupMembership from '../../hooks/useGroupMembership';
import AppLayout from '../../components/AppLayout/AppLayout';
import Toast from '../../components/Toast/Toast';
import ProgressChart from '../../components/ProgressChart/ProgressChart';
import TodayExamsChart from '../../components/TodayExamsChart/TodayExamsChart';
import DashboardHeader from './components/DashboardHeader';
import StatsCards from './components/StatsCards';
import JoinGroupCard from './components/JoinGroupCard';
import RecentExamsTable from './components/RecentExamsTable';
import useDashboardData from './useDashboardData';
import AdminDashboard from './admin/AdminDashboard';
import { getCurrentUser } from '../../api/authApi';
import {
  buildAverageScorePercent,
  buildProgressData,
  buildRecentExams,
  buildTopExamsData,
  countParticipants,
} from './Dashboard.utils';

function MemberDashboard() {
  const location = useLocation();
  const { user, exams, attempts, studentCount, error, clearError } =
    useDashboardData();

  const membership = useGroupMembership(user?.role === 'Student' ? user.id : undefined);
  const getParticipantCount = (examId: string) =>
    countParticipants(attempts, examId);

  const averageScorePercent = buildAverageScorePercent(attempts);
  const recentExams = buildRecentExams(exams);
  const topExamsData = buildTopExamsData(exams, attempts);
  const progressData = buildProgressData(attempts);

  return (
    <AppLayout title={location.pathname === '/workspace' ? 'میز کار' : 'داشبورد'}>
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}

      <div className="glass-dashboard">
      <DashboardHeader user={user} />
      {user?.role === 'Student' && <JoinGroupCard membership={membership} />}

      <StatsCards
        examCount={exams.filter((e) => e.status === 'upcoming').length}
        studentCount={studentCount}
        showStudentCount={user?.role !== 'Student'}
        averageScorePercent={averageScorePercent}
        hasAttempts={attempts.length > 0}
      />

      <section className="glass-chart-grid mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TodayExamsChart data={topExamsData} />
        <ProgressChart data={progressData} />
      </section>

      <RecentExamsTable
        exams={recentExams}
        getParticipantCount={getParticipantCount}
      />
      </div>
    </AppLayout>
  );
}

function DashboardPage() {
  return getCurrentUser()?.role === 'SuperAdmin' ? (
    <AdminDashboard />
  ) : (
    <MemberDashboard />
  );
}

export default DashboardPage;
