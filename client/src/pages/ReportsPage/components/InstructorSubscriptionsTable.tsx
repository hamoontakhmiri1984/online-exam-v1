import { Crown } from 'lucide-react';
import type { AdminInstructor } from '../../../api/adminApi';
import {
  isSubscriptionExpired,
  getRemainingDays,
  type Subscription,
} from '../../../api/subscriptionApi';
import { PLAN_ORDER, PLANS, type PlanId } from '../../../constants/plans';

function InstructorSubscriptionsTable({
  instructors,
  subscriptions,
  updatingId,
  onPlanChange,
}: {
  instructors: AdminInstructor[];
  subscriptions: Record<string, Subscription>;
  updatingId: string | null;
  onPlanChange: (instructorId: string, planId: PlanId) => void;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
        مدیریت اشتراک مدرس‌ها
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        پلن هر مدرس رو دستی تغییر بده - مثلاً برای پرداخت آفلاین یا پشتیبانی
      </p>

      {instructors.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          هنوز مدرسی تو سیستم ثبت نشده
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-150 text-right text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2">مدرس</th>
                <th className="py-2">پلن فعلی</th>
                <th className="py-2">وضعیت</th>
                <th className="py-2">تغییر پلن</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((instructor) => {
                const sub = subscriptions[instructor.id];
                const expired = sub ? isSubscriptionExpired(sub) : false;
                const remainingDays = sub ? getRemainingDays(sub) : null;

                return (
                  <tr
                    key={instructor.id}
                    className="border-b border-gray-100 text-gray-700 dark:border-gray-800 dark:text-gray-200 transition duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 font-medium">
                      {instructor.name || instructor.username}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Crown size={14} className="text-accent-500" />
                        {sub ? PLANS[sub.planId]?.name ?? sub.planId : '—'}
                      </span>
                    </td>
                    <td className="py-3">
                      {!sub ? (
                        '—'
                      ) : expired ? (
                        <span className="rounded-full bg-danger-50 px-3 py-1 text-xs font-semibold text-danger-600 dark:bg-danger-950/40 dark:text-danger-400">
                          منقضی شده
                        </span>
                      ) : remainingDays === null ? (
                        <span className="rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-600 dark:text-success-500">
                          بدون تاریخ انقضا
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-600 dark:text-accent-500">
                          {remainingDays.toLocaleString('fa-IR')} روز مانده
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <select
                        value={sub?.planId ?? ''}
                        aria-label={`تغییر پلن ${
                          instructor.name || instructor.username
                        }`}
                        disabled={updatingId === instructor.id}
                        onChange={(e) =>
                          onPlanChange(instructor.id, e.target.value as PlanId)
                        }
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-60"
                      >
                        {/* بدون اشتراک، مقدارِ '' با هیچ گزینه‌ای نمی‌خوند و
                        select به‌غلط اولین پلن رو انتخاب‌شده نشون می‌داد */}
                        {!sub && (
                          <option value="" disabled>
                            —
                          </option>
                        )}
                        {PLAN_ORDER.map((planId) => (
                          <option key={planId} value={planId}>
                            {PLANS[planId].name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InstructorSubscriptionsTable;
