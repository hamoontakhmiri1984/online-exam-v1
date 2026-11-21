import { XCircle, UsersRound, LogIn } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Toast from '../../components/Toast/Toast';
import ProgressChart from '../../components/ProgressChart/ProgressChart';
import TodayExamsChart from '../../components/TodayExamsChart/TodayExamsChart';
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
import useGroupMembership from '../../hooks/useGroupMembership';
import { DashboardWelcome } from './components/DashboardVisuals';

const panelClass =
  'glass-admin-panel overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-sm dark:border-gray-800 dark:bg-gray-900/80';

function MemberDashboard() {
  const { user, exams, attempts, studentCount, error, clearError } =
    useDashboardData();

  const membership = useGroupMembership(
    user?.role === 'Student' ? user.id : undefined
  );
  const getParticipantCount = (examId: string) =>
    countParticipants(attempts, examId);

  const averageScorePercent = buildAverageScorePercent(attempts);
  const recentExams = buildRecentExams(exams);
  const topExamsData = buildTopExamsData(exams, attempts);
  const progressData = buildProgressData(attempts);
  const displayName = user?.name || user?.username || 'کاربر';
  const isStudent = user?.role === 'Student';
  const description = isStudent
    ? 'نمای کلی آزمون‌ها و روند پیشرفت تحصیلی شما'
    : 'نمای کلی آزمون‌ها، دانشجویان و عملکرد کلاس‌های شما';

  return (
    <AppLayout title="میزکار">
      <div className="glass-dashboard space-y-5">
        {error && (
          <Toast
            message={error}
            tone="danger"
            icon={XCircle}
            onDismiss={clearError}
          />
        )}

        <DashboardWelcome name={displayName} description={description} />

        <StatsCards
          examCount={exams.filter((exam) => exam.status === 'upcoming').length}
          studentCount={studentCount}
          showStudentCount={!isStudent}
          averageScorePercent={averageScorePercent}
          hasAttempts={attempts.length > 0}
          attemptCount={attempts.length}
        />

        <section
          aria-label="تحلیل عملکرد"
          className="grid grid-cols-1 gap-4 xl:grid-cols-2"
        >
          <ProgressChart data={progressData} />
          <TodayExamsChart data={topExamsData} />
        </section>

        {isStudent && (
          <section
            aria-labelledby="join-group-title"
            className={`${panelClass} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <UsersRound size={19} />
              </span>
              <div className="min-w-0">
                <h2 id="join-group-title" className="font-semibold text-gray-900 dark:text-white">
                  پیوستن به گروه کلاس
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  برای دسترسی به آزمون‌های گروهی، کد عضویت مدرس را وارد کنید.
                </p>
              </div>
            </div>
            <form
              onSubmit={membership.handleJoinGroup}
              className="flex w-full min-w-0 flex-col gap-2 sm:max-w-xl sm:flex-row"
            >
              <input
                aria-label="کد عضویت گروه"
                value={membership.joinCode}
                onChange={(event) => {
                  membership.setJoinCode(event.target.value);
                  membership.setJoinError(null);
                }}
                placeholder="کد عضویت گروه"
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white/90 px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={membership.joining}
                className="ui-create-cta inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:cursor-wait disabled:opacity-60"
              >
                <LogIn size={16} />
                {membership.joining ? 'در حال بررسی…' : 'پیوستن به گروه'}
              </button>
            </form>
            {membership.joinError && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">
                {membership.joinError}
              </p>
            )}
            {membership.joinSuccess && (
              <p role="status" className="text-sm text-emerald-600 dark:text-emerald-300">
                {membership.joinSuccess}
              </p>
            )}
          </section>
        )}

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
