import { Crown, AlertTriangle } from 'lucide-react';
import type { Plan } from '../../../constants/plans';
import type {
  Subscription,
  UsageSummary as Usage,
} from '../../../api/subscriptionApi';
import UsageSummary from './UsageSummary';

function CurrentPlanCard({
  subscription,
  plan,
  usage,
  remainingDays,
  isExpired,
  actionLoading,
  onRenew,
}: {
  subscription: Subscription | null;
  plan: Plan | null;
  usage: Usage | null;
  remainingDays: number | null;
  isExpired: boolean;
  actionLoading: boolean;
  onRenew: () => void;
}) {
  if (!subscription || !plan || !usage) return null;

  return (
    <div className="mb-8 max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <Crown size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400">پلن فعلی</p>
            <p className="font-bold text-gray-900 dark:text-white">{plan.name}</p>
          </div>
        </div>

        {remainingDays === null ? (
          <span className="rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-600 dark:text-success-500">
            بدون تاریخ انقضا
          </span>
        ) : isExpired ? (
          <span className="rounded-full bg-danger-50 px-3 py-1 text-xs font-semibold text-danger-600 dark:bg-danger-950/40 dark:text-danger-400">
            منقضی شده
          </span>
        ) : (
          <span className="rounded-full bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-600 dark:text-accent-500">
            {remainingDays.toLocaleString('fa-IR')} روز باقی‌مانده
          </span>
        )}
      </div>

      {isExpired && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-danger-50 px-4 py-3 text-xs text-danger-700 dark:bg-danger-950/30 dark:text-danger-300">
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={14} />
            اشتراکت منقضی شده. تا وقتی تمدید نکنی امکاناتی که به سقف پلن رایگان
            محدودن رو نمی‌تونی افزایش بدی.
          </span>
          <button
            onClick={onRenew}
            disabled={actionLoading}
            className="shrink-0 rounded-lg bg-danger-600 px-3 py-1.5 font-bold text-white transition hover:bg-danger-700 disabled:opacity-60"
          >
            تمدید
          </button>
        </div>
      )}

      <UsageSummary plan={plan} usage={usage} />
    </div>
  );
}

export default CurrentPlanCard;