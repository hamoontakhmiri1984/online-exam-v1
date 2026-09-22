import { useEffect, useState } from 'react';
import { getInstructorsByStatus, type AdminInstructor } from '../api/adminApi';
import {
  getAllSubscriptions,
  assignSubscription,
  type Subscription,
} from '../api/subscriptionApi';
import type { PlanId } from '../constants/plans';

type UseInstructorSubscriptionsResult = {
  instructors: AdminInstructor[];
  subscriptions: Record<string, Subscription>;
  updatingId: string | null;
  error: string | null;
  clearError: () => void;
  handlePlanChange: (instructorId: string, planId: PlanId) => Promise<void>;
};

function useInstructorSubscriptions(): UseInstructorSubscriptionsResult {
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    Record<string, Subscription>
  >({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // قبلاً هر دو درخواست بدون catch بودن (unhandled rejection و جدولِ خالیِ
    // بی‌دلیل)؛ حالا با خطا پیام نشون داده می‌شه
    Promise.all([getInstructorsByStatus('Approved'), getAllSubscriptions()])
      .then(([instructorList, subs]) => {
        if (cancelled) return;
        setInstructors(instructorList);
        setSubscriptions(
          Object.fromEntries(subs.map((s) => [s.instructorId, s]))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError('دریافت لیست مدرس‌ها و اشتراک‌ها با خطا مواجه شد');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePlanChange(instructorId: string, planId: PlanId) {
    setUpdatingId(instructorId);
    setError(null);
    try {
      const updated = await assignSubscription(instructorId, planId);
      setSubscriptions((prev) => ({ ...prev, [instructorId]: updated }));
    } catch {
      setError('تغییر پلن مدرس با خطا مواجه شد');
    } finally {
      setUpdatingId(null);
    }
  }

  return {
    instructors,
    subscriptions,
    updatingId,
    error,
    clearError: () => setError(null),
    handlePlanChange,
  };
}

export default useInstructorSubscriptions;
