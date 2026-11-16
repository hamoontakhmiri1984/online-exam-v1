import { useNavigate } from 'react-router-dom';
import { Check, Crown, Medal, Gem, Gift, Sparkles } from 'lucide-react';

import { PLANS, PLAN_ORDER, type PlanId } from '../../../constants/plans';
import Reveal, { RevealGroup, RevealItem } from '../../../components/motion/Reveal';

interface PlanView {
  description: string;
  cta: string;
  variant: 'plain' | 'accent' | 'highlighted' | 'dark';
  badge?: string;
}

const PLAN_VIEWS: Record<PlanId, PlanView> = {
  free: {
    description: 'برای شروع و تست سامانه، بدون نیاز به کارت بانکی.',
    cta: 'شروع رایگان',
    variant: 'plain',
  },
  gold: {
    description: 'برای مدرس‌هایی که چند آزمون رو هم‌زمان مدیریت می‌کنن.',
    cta: 'انتخاب طلایی',
    variant: 'accent',
  },
  platinum: {
    description: 'مناسب آموزشگاه‌ها و تیم‌های چند مدرسه.',
    cta: 'انتخاب پلاتینیوم',
    variant: 'highlighted',
    badge: 'پیشنهاد محبوب',
  },
  vip: {
    description: 'همه‌چیز نامحدود، به‌علاوه‌ی برندینگ اختصاصی خودت.',
    cta: 'انتخاب VIP',
    variant: 'dark',
  },
};

const TIER_ICONS = { free: Gift, gold: Medal, platinum: Gem, vip: Crown };
const TIER_SUBTITLES = { free: 'شروع رایگان', gold: 'نشان طلایی', platinum: 'الماس پلاتینیوم', vip: 'تاج ویژه' };
const TIER_BARS = { free: 'from-slate-400 via-slate-200 to-slate-400', gold: 'from-amber-600 via-yellow-300 to-amber-500', platinum: 'from-sky-600 via-slate-200 to-indigo-500', vip: 'from-purple-700 via-fuchsia-400 to-amber-300' };
const VARIANT_STYLES: Record<PlanView['variant'], string> = {
  plain:
    'border border-slate-200/60 bg-white/65 backdrop-blur-xl shadow-sm dark:border-slate-500/25 dark:bg-slate-900/65',
  accent:
    'border border-amber-300/50 bg-gradient-to-br from-white/80 via-amber-50/65 to-violet-50/50 backdrop-blur-xl shadow-md shadow-amber-500/5 dark:border-amber-500/30 dark:from-stone-900/85 dark:via-stone-900/75 dark:to-violet-950/75',
  highlighted:
    'border border-sky-300/55 bg-gradient-to-br from-white/80 via-sky-50/65 to-violet-50/60 backdrop-blur-xl shadow-lg shadow-indigo-500/10 lg:-translate-y-1 dark:border-sky-400/40 dark:from-slate-900/85 dark:via-slate-800/75 dark:to-indigo-950/75',
  dark: 'border border-violet-300/65 bg-gradient-to-br from-violet-100/90 via-purple-100/80 to-indigo-100/75 backdrop-blur-xl shadow-xl shadow-purple-600/15 dark:border-violet-400/55 dark:from-violet-950/90 dark:via-purple-950/85 dark:to-indigo-950/80',
};

type PricingProps = {
  data?: Record<string, unknown>;
};

function readString(
  data: Record<string, unknown> | undefined,
  key: string
): string {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value : '';
}

function Pricing({ data }: PricingProps) {
  const navigate = useNavigate();
  const title = readString(data, 'title') || 'تعرفه‌ای متناسب با نیازت';
  const subtitle =
    readString(data, 'subtitle') ||
    'از یه آزمون کوچیک تا مدیریت چند آموزشگاه — هر وقت خواستی ارتقا بده.';

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="mx-auto mb-14 max-w-xl text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </Reveal>

      <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const view = PLAN_VIEWS[planId];
          const isDark = false; // All tiers use readable light glass, with dark-mode utility variants.
          const TierIcon = TIER_ICONS[planId];
          const isHighlighted = view.variant === 'highlighted';

          return (
            <RevealItem
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-6 transition duration-300 hover:-translate-y-1 ${
                VARIANT_STYLES[view.variant]
              }`}
            >
              <div aria-hidden="true" className={`absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-l ${TIER_BARS[planId]}`} />
              {(planId === 'platinum' || planId === 'vip') && <Sparkles size={19} aria-hidden="true" className={`absolute left-5 top-5 ${isDark ? 'text-amber-300' : 'text-sky-500'}`} />}
              {view.badge && (
                <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  {view.badge}
                </span>
              )}

              <div className="flex items-center gap-2">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner ${planId === 'free' ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200' : planId === 'gold' ? 'bg-amber-200 text-amber-800 dark:bg-amber-700/30 dark:text-amber-200' : planId === 'platinum' ? 'bg-sky-200 text-blue-800 dark:bg-sky-700/30 dark:text-sky-200' : 'bg-violet-200/70 text-violet-800 dark:bg-violet-500/30 dark:text-violet-200'}`}><TierIcon size={29} strokeWidth={1.8}/></span>
                <div>
                <h3
                  className={`text-lg font-extrabold ${
                    isDark ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {plan.name}
                </h3>
                <span className={`text-[11px] font-semibold ${isDark ? 'text-purple-200' : 'text-gray-500 dark:text-gray-300'}`}>{TIER_SUBTITLES[planId]}</span>
                </div>
              </div>

              <p
                className={`mt-2 text-xs leading-6 ${
                  isDark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {view.description}
              </p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span
                  className={`text-3xl font-extrabold ${
                    isDark ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <span className="pricing-numeral">{plan.priceLabel}</span>
                </span>
                <span
                  className={`text-xs ${
                    isDark
                      ? 'text-gray-400'
                      : 'text-gray-400 dark:text-gray-500'
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
                      isDark
                        ? 'text-gray-300'
                        : 'text-gray-600 dark:text-gray-300'
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
                onClick={() => navigate('/signup')}
                className={`mt-7 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold transition duration-300 hover:-translate-y-0.5 ${
                  isDark
                    ? 'bg-white text-gray-900 hover:shadow-lg hover:shadow-white/10'
                    : isHighlighted
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/40'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {view.cta}
              </button>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </section>
  );
}

export default Pricing;
