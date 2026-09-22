import { useNavigate } from 'react-router-dom';
import { Check, Crown } from 'lucide-react';

import { PLANS, PLAN_ORDER, type PlanId } from '../../../constants/plans';
import Reveal, { RevealGroup, RevealItem } from '../../../components/motion/Reveal';

// نام، قیمت و فیچرهای هر پلن از constants/plans.ts میاد (تنها منبع)؛
// اینجا فقط چیزهایی هست که مخصوص نمایش تو لندینگه
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

const VARIANT_STYLES: Record<PlanView['variant'], string> = {
  plain:
    'bg-white border border-gray-100 dark:bg-gray-900 dark:border-gray-800',
  accent:
    'bg-white border border-accent-500/30 dark:bg-gray-900 dark:border-accent-500/30',
  highlighted:
    'bg-white border-2 border-brand-600 shadow-xl shadow-brand-600/10 lg:-translate-y-3 dark:bg-gray-900',
  dark: 'bg-gray-900 border border-gray-800 text-white',
};

type PricingProps = {
  // خروجیِ PricingSectionForm (پنل ادمین -> /site-content) - فقط عنوان و
  // زیرعنوانِ بالای جدول؛ خودِ کارت‌های پلن از constants/plans.ts میاد
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
          const isDark = view.variant === 'dark';
          const isHighlighted = view.variant === 'highlighted';

          return (
            <RevealItem
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-6 transition duration-300 hover:-translate-y-1 ${
                VARIANT_STYLES[view.variant]
              }`}
            >
              {view.badge && (
                <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  {view.badge}
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
                  {plan.priceLabel}
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
