import { resolveIcon } from '../../../constants/iconRegistry';
import Reveal, { RevealGroup, RevealItem } from '../../../components/motion/Reveal';

type Pillar = { icon: string; title: string; description: string };

type AboutProps = {
  // خروجیِ AboutSectionForm (پنل ادمین -> /site-content)
  data?: Record<string, unknown>;
};

// همون سه ستونِ پیش‌فرضِ قبلی - وقتی ادمین هنوز چیزی ذخیره نکرده همینا
// دیده می‌شن (آیکون‌هاشون از همون iconRegistry ـه که فرم ادمین استفاده
// می‌کنه: Zap/ShieldCheck/Headphones)
const DEFAULT_PILLARS: Pillar[] = [
  {
    icon: 'Zap',
    title: 'سادگی و سرعت',
    description: 'ساخت آزمون و بانک سوال در چند دقیقه، بدون آموزش پیچیده.',
  },
  {
    icon: 'ShieldCheck',
    title: 'امنیت داده‌ها',
    description:
      'اطلاعات سوال‌ها و نمره‌ها فقط در دسترس خود مدرس و مدیر می‌مونه.',
  },
  {
    icon: 'Headphones',
    title: 'پشتیبانی واقعی',
    description: 'پشت هر پیام یه آدم واقعی جواب می‌ده، نه ربات خودکار.',
  },
];

function readString(
  data: Record<string, unknown> | undefined,
  key: string
): string {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value : '';
}

function readPillars(data: Record<string, unknown> | undefined): Pillar[] {
  const value = data?.pillars;
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_PILLARS;
  const parsed = value
    .filter(
      (v): v is Record<string, unknown> => typeof v === 'object' && v !== null
    )
    .map((v) => ({
      icon: typeof v.icon === 'string' ? v.icon : 'Zap',
      title: typeof v.title === 'string' ? v.title : '',
      description: typeof v.description === 'string' ? v.description : '',
    }));
  return parsed.length > 0 ? parsed : DEFAULT_PILLARS;
}

function About({ data }: AboutProps) {
  const title = readString(data, 'title') || 'چرا این سامانه رو ساختیم';
  const description =
    readString(data, 'description') ||
    'برگزاری آزمون آنلاین نباید نیاز به چند تا ابزار جدا و یه عالمه تنظیمات پیچیده داشته باشه. هدف ما اینه که مدرس‌ها با کمترین دردسر، آزمونی حرفه‌ای بسازن و دانش‌آموزها هم تجربه‌ای روون و بدون استرس داشته باشن.';
  const pillars = readPillars(data);

  return (
    <section
      id="about"
      className="border-y border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900/40"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-8 text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </Reveal>

        <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {pillars.map((pillar, index) => {
            const Icon = resolveIcon(pillar.icon);
            return (
              <RevealItem
                key={`${pillar.title}-${index}`}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/10 dark:text-brand-400">
                  <Icon size={22} />
                </div>
                <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className="max-w-xs text-xs leading-6 text-gray-500 dark:text-gray-400">
                  {pillar.description}
                </p>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}

export default About;
