import { XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import useReportsData from '../../hooks/useReportsData';
import useInstructorSubscriptions from '../../hooks/useInstructorSubscriptions';
import SummaryCards from './components/SummaryCards';
import InstructorSubscriptionsTable from './components/InstructorSubscriptionsTable';
import RecentAttemptsTable from './components/RecentAttemptsTable';

function ReportsPage() {
  const { exams, students, attempts, loading, error, clearError } =
    useReportsData();
  const {
    instructors,
    subscriptions,
    updatingId,
    error: subscriptionError,
    clearError: clearSubscriptionError,
    handlePlanChange,
  } = useInstructorSubscriptions();

  if (loading) {
    return (
      <AppLayout title="گزارش‌ها">
        <Spinner />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="گزارش‌ها">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}
      {subscriptionError && (
        <Toast
          message={subscriptionError}
          tone="danger"
          icon={XCircle}
          onDismiss={clearSubscriptionError}
        />
      )}

      <h1 className="text-2xl font-bold mb-6 dark:text-white">گزارش‌ها</h1>

      <SummaryCards exams={exams} students={students} attempts={attempts} />

      <InstructorSubscriptionsTable
        instructors={instructors}
        subscriptions={subscriptions}
        updatingId={updatingId}
        onPlanChange={handlePlanChange}
      />

      <RecentAttemptsTable
        exams={exams}
        attempts={attempts}
        students={students}
      />
    </AppLayout>
  );
}

export default ReportsPage;
