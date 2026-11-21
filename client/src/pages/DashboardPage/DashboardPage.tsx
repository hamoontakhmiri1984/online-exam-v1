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
  'glass-admin-panel overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900';

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
  const description =
    user?.role === 'Student'
      ? 'وضعیت آزمون‌ها، نتایج و روند پیشرفت تحصیلی شما'
      : 'نمای کلی آزمون‌ها، دانشجویان و عملکرد کلاس‌های شما';

  return (
    <AppLayout title="میزکار">
      <div className="glass-dashboard">
        {error && (
          <Toast
            message={error}
            tone="danger"
            icon={XCircle}
            onDismiss={clearError}
          />
        )}

        <DashboardWelcome name={displayName} description={description} />

        {user?.role === 'Student' && (
          <section className={`${panelClass} mb-6 p-5 sm:p-6`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-brand-ink dark:bg-violet-500/20">
                <UsersRound size={21} />
              </span>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  پیوستن به گروه کلاس
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  کد عضویت را از مدرس دریافت کنید و وارد شوید.
                </p>
              </div>
            </div>
            <form
              onSubmit={membership.handleJoinGroup}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                aria-label="کد عضویت گروه"
                value={membership.joinCode}
                onChange={(event) => {
                  membership.setJoinCode(event.target.value);
                  membership.setJoinError(null);
                }}
                placeholder="کد عضویت گروه"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={membership.joining}
                className="ui-create-cta inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 disabled:cursor-wait disabled:opacity-60"
              >
                <LogIn size={17} />
                {membership.joining ? 'در حال بررسی…' : 'پیوستن به گروه'}
              </button>
            </form>
            {membership.joinError && (
              <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-300">
                {membership.joinError}
              </p>
            )}
            {membership.joinSuccess && (
              <p role="status" className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">
                {membership.joinSuccess}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="dashboard-stats-title" className="mb-3">
          <h2
            id="dashboard-stats-title"
            className="mb-3 font-semibold text-gray-900 dark:text-white"
          >
            نمای کلی عملکرد
          </h2>
          <StatsCards
            examCount={exams.filter((exam) => exam.status === 'upcoming').length}
            studentCount={studentCount}
            showStudentCount={user?.role !== 'Student'}
            averageScorePercent={averageScorePercent}
            hasAttempts={attempts.length > 0}
            attemptCount={attempts.length}
          />
        </section>

        <section
          aria-label="نمودارهای عملکرد"
          className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
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
