import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Sparkles, ShieldCheck, BarChart3, Users } from 'lucide-react';
import ExamHeroIllustration from './ExamHeroIllustration';
import { useAuth } from '../../../context/AuthContext';
import { getLandingAccountView } from './landingAccountView';

const DEFAULT_TRUST_POINTS = [
  'بدون نیاز به کارت بانکی',
  'راه‌اندازی در کمتر از ۲ دقیقه',
];

type HeroProps = {
  data?: Record<string, unknown>;
};

function readString(
  data: Record<string, unknown> | undefined,
  key: string
): string {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value : '';
}

function Hero({ data }: HeroProps) {
  const navigate = useNavigate();
  const { user, isSessionReady } = useAuth();
  const account = getLandingAccountView({ user, isSessionReady });

  const title = readString(data, 'title');
  const subtitle = readString(data, 'subtitle');
  const ctaText = readString(data, 'ctaText') || 'شروع رایگان';
  const trustPointsRaw = data?.trustPoints;
  const trustPoints =
    Array.isArray(trustPointsRaw) &&
    trustPointsRaw.every((p): p is string => typeof p === 'string') &&
    trustPointsRaw.length > 0
      ? trustPointsRaw
      : DEFAULT_TRUST_POINTS;

  return (
    <section className="glass-hero relative overflow-hidden">

      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl dark:bg-brand-600/20 " />
      <div className="pointer-events-none absolute top-32 right-0 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl dark:bg-accent-500/10 " />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:gap-20">

        <div className="glass-hero-copy">
          <div className="glass-eyebrow mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"><Sparkles size={14} /> پلتفرم نسل جدید آموزش و ارزیابی</div>
          {title ? (
            <h1 className="glass-enter text-4xl font-black leading-[1.3] text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              {title}
            </h1>
          ) : (
            <h1 className="glass-enter text-4xl font-extrabold leading-[1.3] text-gray-900 dark:text-white sm:text-5xl">
              برگزاری آزمون آنلاین،{' '}
              <span className="text-brand-ink">
                به سبک آینده
              </span>
            </h1>
          )}

          <p className="glass-delay-1 glass-enter mt-5 max-w-md text-base leading-8 text-gray-500 dark:text-gray-400">
            {subtitle ||
              'بانک سوال بساز، آزمون زمان‌دار طراحی کن، و نتیجه رو لحظه‌ای ببین — همه‌چیز تو یه پنل ساده و شیک، آماده‌ی استفاده.'}
          </p>

          <div className="glass-delay-2 glass-enter mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(account.status === 'authenticated' ? account.dashboardPath : '/signup')}
              className="ui-primary-gradient rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition duration-300 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/40"
            >
              {account.status === 'authenticated' ? 'ورود به میزکار' : ctaText}
              <ArrowLeft size={16} className="mr-2 inline-block" aria-hidden="true" />
            </button>
            <a
              href="#features"
              className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              مشاهده امکانات
            </a>
          </div>

          <div className="glass-delay-3 glass-enter mt-7 flex flex-col gap-2 sm:flex-row sm:gap-6">
            {trustPoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                <CheckCircle2 size={14} className="text-success-600" />
                {point}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-hero-art glass-delay-2 glass-enter flex justify-center md:justify-end">
          <ExamHeroIllustration />
        </div>
      </div>
      <div className="glass-hero-benefits relative mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 pb-12 sm:grid-cols-3 sm:px-6"><div className="glass-benefit"><ShieldCheck size={22} /><span>امنیت و کنترل آزمون‌ها</span></div><div className="glass-benefit"><BarChart3 size={22} /><span>گزارش‌های تحلیلی دقیق</span></div><div className="glass-benefit"><Users size={22} /><span>مدیریت کاربران و گروه‌ها</span></div></div>
    </section>
  );
}

export default Hero;
