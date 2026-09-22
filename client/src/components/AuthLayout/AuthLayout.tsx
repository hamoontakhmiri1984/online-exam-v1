import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, ArrowRight, Check } from 'lucide-react';
import Logo from '../Logo/Logo';
import useTheme from '../../hooks/useTheme';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** خط پایین کارت، مثلاً «حساب نداری؟ ثبت‌نام رایگان» */
  footer: ReactNode;
};

const BRAND_POINTS = [
  'ساخت بانک سوال و آزمون در چند دقیقه',
  'گزارش و تحلیل نتایج به‌صورت لحظه‌ای',
  'مدیریت گروه‌های دانشجویی با کد دعوت',
];

/**
 * پوسته‌ی مشترک صفحات لاگین/ثبت‌نام. توی دسکتاپ یه چیدمان دوستونه‌ست
 * (پنل برندینگ + پنل فرم)، توی موبایل فقط پنل فرم (تمام‌عرض) نشون داده
 * می‌شه. LoginPage و SignupPage فقط عنوان/فرم/فوتر رو بهش می‌دن.
 */
function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors">
      {/* پنل برندینگ - فقط از lg به بالا نشون داده می‌شه */}
      <div className="relative hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between overflow-hidden bg-brand-700 px-10 py-12 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <button
          onClick={() => navigate('/')}
          className="relative flex items-center gap-2.5 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <path
                d="M6.5 4H14L18.5 8.5V20H6.5V4Z"
                stroke="white"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M14 4V8.5H18.5"
                stroke="white"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M9 13.4L11.1 15.5L15.5 10.7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-base font-bold">سامانه آزمون</span>
        </button>

        <div className="relative flex flex-col gap-8">
          <h2 className="text-3xl font-extrabold leading-[1.4]">
            برگزاری آزمون آنلاین،{' '}
            <span className="text-brand-200">بدون دردسر</span>
          </h2>

          <div className="flex flex-col gap-3">
            {BRAND_POINTS.map((text) => (
              <div key={text} className="flex items-center gap-2.5">
                <Check size={15} className="shrink-0 text-brand-200" />
                <span className="text-sm text-brand-50">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-brand-200">
          © ۱۴۰۵ سامانه آزمون آنلاین
        </p>
      </div>

      {/* پنل فرم */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex items-center justify-between lg:justify-end">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 cursor-pointer lg:hidden"
            >
              <Logo size="md" showText />
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition duration-300 hover:rotate-45 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <h1 className="text-center text-2xl font-bold text-gray-800 dark:text-white">
              {title}
            </h1>
            <p className="mt-1 mb-6 text-center text-sm text-gray-400 dark:text-gray-400">
              {subtitle}
            </p>
            {children}
            <p className="mt-5 text-center text-xs text-gray-500 dark:text-gray-400">
              {footer}
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="stagger-1 animate-fade-slide-up group mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-brand-600 dark:text-gray-400 dark:hover:text-white cursor-pointer"
          >
            <ArrowRight
              size={15}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            بازگشت به صفحه اصلی
          </button>

          <p className="mt-4 text-center text-xs text-gray-400 lg:hidden">
            © ۱۴۰۵ سامانه آزمون آنلاین
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
