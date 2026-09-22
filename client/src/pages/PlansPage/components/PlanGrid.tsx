import { PLAN_ORDER, PLANS, type PlanId } from '../../../constants/plans';
import type { Subscription } from '../../../api/subscriptionApi';
import PlanCard from './PlanCard';

function buttonLabel(
  planId: PlanId,
  index: number,
  currentIndex: number,
  subscription: Subscription | null,
  isExpired: boolean
): string {
  if (subscription && planId === subscription.planId) {
    return isExpired ? 'تمدید' : 'پلن فعلی';
  }
  if (currentIndex === -1) return 'انتخاب پلن';
  return index > currentIndex ? 'ارتقا' : 'تغییر به این پلن';
}

function PlanGrid({
  subscription,
  isExpired,
  actionLoading,
  onSelect,
}: {
  subscription: Subscription | null;
  isExpired: boolean;
  actionLoading: boolean;
  onSelect: (planId: PlanId) => void;
}) {
  const currentIndex = subscription
    ? PLAN_ORDER.indexOf(subscription.planId)
    : -1;
  // تا پایان دوره‌ی پلن پولیِ فعلی، رفتن به پلن پایین‌تر بسته‌ست (سرور هم رد می‌کنه)
  const hasActivePaidPlan =
    !!subscription && !isExpired && PLANS[subscription.planId].price > 0;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_ORDER.map((planId, index) => {
        const isCurrent = subscription?.planId === planId;
        const isCurrentActive = isCurrent && !isExpired;
        const isLowerBlocked = hasActivePaidPlan && index < currentIndex;

        return (
          <PlanCard
            key={planId}
            plan={PLANS[planId]}
            isCurrent={!!isCurrent}
            isCurrentActive={!!isCurrentActive}
            isHighlighted={planId === 'platinum'}
            label={
              isLowerBlocked
                ? 'بعد از پایان دوره'
                : buttonLabel(
                    planId,
                    index,
                    currentIndex,
                    subscription,
                    isExpired
                  )
            }
            disabled={isCurrentActive || isLowerBlocked || actionLoading}
            onSelect={() => onSelect(planId)}
          />
        );
      })}
    </div>
  );
}

export default PlanGrid;
