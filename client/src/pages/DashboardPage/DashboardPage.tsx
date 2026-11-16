import { useLocation } from 'react-router-dom';
import { XCircle, UsersRound, LogIn } from 'lucide-react';
import useGroupMembership from '../../hooks/useGroupMembership';
import AppLayout from '../../components/AppLayout/AppLayout';
import Toast from '../../components/Toast/Toast';
import ProgressChart from '../../components/ProgressChart/ProgressChart';
import TodayExamsChart from '../../components/TodayExamsChart/TodayExamsChart';
import DashboardHeader from './components/DashboardHeader';
import StatsCards from './components/StatsCards';
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
      {user?.role === 'Student' && <section className="mb-7 rounded-3xl border border-violet-200/50 bg-white/80 p-5 shadow-sm dark:border-violet-400/20 dark:bg-slate-800/70 sm:p-6"><div className="mb-4 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"><UsersRound size={21}/></span><div><h2 className="font-bold text-slate-800 dark:text-white">پیوستن به گروه کلاس</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">کدی که مدرس داده رو وارد کن تا آزمون‌های گروهت رو ببینی.</p></div></div><form onSubmit={membership.handleJoinGroup} className="flex flex-col gap-2 sm:flex-row"><input aria-label="کد عضویت گروه" value={membership.joinCode} onChange={e=>{membership.setJoinCode(e.target.value);membership.setJoinError(null);}} placeholder="کد عضویت گروه" className="min-h-11 min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-4 text-sm outline-none focus:border-violet-400 dark:border-violet-400/25 dark:bg-slate-900 dark:text-white"/><button type="submit" disabled={membership.joining} className="ui-create-cta"><LogIn size={17}/>{membership.joining?'در حال بررسی…':'پیوستن به گروه'}</button></form>{membership.joinError && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-300">{membership.joinError}</p>}{membership.joinSuccess && <p role="status" className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{membership.joinSuccess}</p>}</section>}

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
