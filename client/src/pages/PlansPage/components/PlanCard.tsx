import { Check, Gift, Medal, Gem, Crown, Sparkles } from 'lucide-react';
import type { Plan, PlanId } from '../../../constants/plans';

const VARIANT_STYLES: Record<PlanId, string> = {
  free: 'plan-tier-free border border-slate-200/70',
  gold: 'plan-tier-gold border border-amber-300/60',
  platinum: 'plan-tier-platinum border-2 border-slate-300/80 shadow-lg',
  vip: 'plan-tier-vip border-2 border-violet-400/60 shadow-xl shadow-violet-600/10',
};
const PLAN_ICONS = { free: Gift, gold: Medal, platinum: Gem, vip: Crown };
const TIER_LABELS: Record<PlanId, string> = {
  free: 'شروع هوشمند',
  gold: 'نشان طلایی',
  platinum: 'الماس پلاتینیوم',
  vip: 'تاج ویژه',
};
const TIER_ACCENTS: Record<PlanId, string> = {
  free: 'from-slate-400 via-slate-300 to-slate-400',
  gold: 'from-amber-500 via-yellow-300 to-amber-600',
  platinum: 'from-sky-500 via-slate-200 to-indigo-500',
  vip: 'from-purple-600 via-fuchsia-400 to-amber-400',
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
  const TierIcon = PLAN_ICONS[plan.id];
  return (
    <div
      className={`glass-plan-card relative isolate flex flex-col overflow-visible rounded-2xl p-6 transition duration-300 ${
        isCurrentActive ? '' : 'hover:-translate-y-1'
      } ${VARIANT_STYLES[plan.id]}`}
    >
      <div aria-hidden="true" className={`pointer-events-none absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-l ${TIER_ACCENTS[plan.id]}`} />
      {(plan.id === 'platinum' || plan.id === 'vip') && (
        <Sparkles aria-hidden="true" className={`pointer-events-none absolute left-5 top-5 ${plan.id === 'vip' ? 'text-fuchsia-500 dark:text-fuchsia-300' : 'text-sky-500 dark:text-sky-300'}`} size={19} />
      )}
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

      <div className="flex items-center gap-3">
        <span className="plan-tier-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner"><TierIcon size={29} strokeWidth={1.85} /></span>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{plan.name}</h3>
          <p className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-300">{TIER_LABELS[plan.id]}</p>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className={`plan-price-amount text-3xl font-extrabold text-gray-900 dark:text-white`}
        >
          {plan.priceLabel}
        </span>
        <span
          className={`text-xs text-gray-500 dark:text-gray-400`}
        >
          {plan.durationDays === null ? 'همیشه رایگان' : 'تومان / ماه'}
        </span>
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={`flex items-start gap-2 text-xs leading-6 text-gray-600 dark:text-gray-300`}
          >
            <Check
              size={15}
              className={`mt-0.5 shrink-0 text-violet-600 dark:text-violet-300`}
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