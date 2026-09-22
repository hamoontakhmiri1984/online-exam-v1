import { Check, Crown } from 'lucide-react';
import type { Plan, PlanId } from '../../../constants/plans';

const VARIANT_STYLES: Record<PlanId, string> = {
  free: 'bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800',
  gold: 'bg-white border border-accent-500/30 dark:bg-gray-900 dark:border-accent-500/30',
  platinum:
    'bg-white border-2 border-brand-600 shadow-xl shadow-brand-600/10 lg:-translate-y-3 dark:bg-gray-900',
  vip: 'bg-gray-900 border border-gray-800 text-white',
};

function PlanCard({
  plan,
  isCurrent,
  isCurrentActive,
  isHighlighted,
  label,
  disabled,
  onSelect,
}: {
  plan: Plan;
  isCurrent: boolean;
  isCurrentActive: boolean;
  isHighlighted: boolean;
  label: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  const isDark = plan.id === 'vip';

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 transition duration-300 ${
        isCurrentActive ? '' : 'hover:-translate-y-1'
      } ${VARIANT_STYLES[plan.id]}`}
    >
      {isHighlighted && !isCurrent && (
        <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
          پیشنهاد محبوب
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-success-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
          پلن فعلی تو
        </span>
      )}

      <div className="flex items-center gap-2">
        {isDark && <Crown size={18} className="text-accent-400" />}
        <h3
          className={`text-base font-bold ${
            isDark ? 'text-white' : 'text-gray-900 dark:text-white'
          }`}
        >
          {plan.name}
        </h3>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className={`text-3xl font-extrabold ${
            isDark ? 'text-white' : 'text-gray-900 dark:text-white'
          }`}
        >
          {plan.priceLabel}
        </span>
        <span
          className={`text-xs ${
            isDark ? 'text-gray-400' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {plan.durationDays === null ? 'همیشه رایگان' : 'تومان / ماه'}
        </span>
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={`flex items-start gap-2 text-xs leading-6 ${
              isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <Check
              size={15}
              className={`mt-0.5 shrink-0 ${
                isDark ? 'text-success-500' : 'text-success-600'
              }`}
            />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={disabled}
        className={`mt-7 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition duration-300 disabled:cursor-not-allowed ${
          isCurrentActive
            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            : isDark
            ? 'bg-white text-gray-900 hover:shadow-lg hover:shadow-white/10'
            : isHighlighted
            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/40'
            : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
        }`}
      >
        {label}
      </button>
    </div>
  );
}

export default PlanCard;