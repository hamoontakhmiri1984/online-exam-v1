import { useEffect, useState } from 'react';
import { getCurrentUser } from '../api/authApi';
import {
  getSubscription,
  getInstructorUsage,
  isSubscriptionExpired,
  getRemainingDays,
  type Subscription,
  type UsageSummary,
} from '../api/subscriptionApi';
import { getPlan, type Plan } from '../constants/plans';

type UseSubscriptionResult = {
  loading: boolean;
  subscription: Subscription | null;
  plan: Plan | null;
  usage: UsageSummary | null;
  remainingDays: number | null;
  isExpired: boolean;
  refresh: () => void;
};

function useSubscription(): UseSubscriptionResult {
  const currentUser = getCurrentUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Instructor') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getSubscription(currentUser.id),
      getInstructorUsage(currentUser.id),
    ])
      .then(([sub, usageData]) => {
        if (cancelled) return;
        setSubscription(sub);
        setUsage(usageData);
      })
      // قبلاً catch نداشت و خطای شبکه unhandled rejection می‌شد؛ موقع خطا
      // همون مقدارِ قبلی می‌مونه
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, refreshKey]);

  const plan = subscription ? getPlan(subscription.planId) : null;
  const remainingDays = subscription ? getRemainingDays(subscription) : null;
  const isExpired = subscription ? isSubscriptionExpired(subscription) : false;

  function refresh() {
    setRefreshKey((key) => key + 1);
  }

  return {
    loading,
    subscription,
    plan,
    usage,
    remainingDays,
    isExpired,
    refresh,
  };
}

export default useSubscription;
