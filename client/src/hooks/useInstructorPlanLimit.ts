import { useState } from 'react';
import type { RemainingQuota } from '../api/subscriptionApi';

export type LimitedQuota = Extract<RemainingQuota, { limited: true }>;

type UseInstructorPlanLimitParams = {
  isGated: boolean;
  fetchQuota: () => Promise<RemainingQuota>;
};

function useInstructorPlanLimit({
  isGated,
  fetchQuota,
}: UseInstructorPlanLimitParams) {
  const [limitQuota, setLimitQuota] = useState<LimitedQuota | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(false);

  async function ensureAllowed(): Promise<boolean> {
    if (!isGated) return true;
    setCheckingLimit(true);
    const quota = await fetchQuota();
    setCheckingLimit(false);
    if (quota.limited && (quota.expired || quota.remaining === 0)) {
      setLimitQuota(quota);
      return false;
    }
    return true;
  }

  async function getQuotaIfGated(): Promise<LimitedQuota | null> {
    if (!isGated) return null;
    const quota = await fetchQuota();
    return quota.limited ? quota : null;
  }

  return {
    limitQuota,
    checkingLimit,
    ensureAllowed,
    getQuotaIfGated,
    showLimit: setLimitQuota,
    dismissLimit: () => setLimitQuota(null),
  };
}

export default useInstructorPlanLimit;