import { resolveIcon } from '../../../constants/iconRegistry';
import Reveal, { RevealGroup, RevealItem } from '../../../components/motion/Reveal';

type FeatureItem = { icon: string; title: string; description: string };

type FeaturesProps = {
  // خروجیِ FeaturesSectionForm (پنل ادمین -> /site-content)
  data?: Record<string, unknown>;
};

const DEFAULT_FEATURES: FeatureItem[] = [
  {
    icon: 'ListChecks',
    title: 'بانک سوال منظم',
    description:
      'سوالات چندگزینه‌ای رو دسته‌بندی‌شده بساز، ویرایش کن و برای هر آزمون دوباره استفاده‌شون کن.',
  },
  {
    icon: 'FileSpreadsheet',
    title: 'ایمپورت از اکسل',
    description:
      'صدها سوال رو یک‌جا از فایل اکسل وارد کن — با قالب آماده و پیش‌نمایش قبل از ثبت نهایی.',
  },
  {
    icon: 'Timer',
    title: 'تایمر هوشمند',
    description:
      'برای هر آزمون زمان دقیق تعیین کن؛ شمارش معکوس خودکار و پایان به‌موقع بدون دخالت دستی.',
  },
  {
    icon: 'BarChart3',
    title: 'گزارش‌گیری لحظه‌ای',
    description:
      'نمره‌ها و آمار شرکت‌کننده‌ها رو همون لحظه ببین، بدون نیاز به تصحیح دستی برگه.',
  },
];

function readString(
  data: Record<string, unknown> | undefined,
  key: string
): string {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value : '';
}

function readItems(data: Record<string, unknown> | undefined): FeatureItem[] {
  const value = data?.items;
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_FEATURES;
  const parsed = value
    .filter(
      (v): v is Record<string, unknown> => typeof v === 'object' && v !== null
    )
    .map((v) => ({
      icon: typeof v.icon === 'string' ? v.icon : 'Sparkles',
      title: typeof v.title === 'string' ? v.title : '',
      description: typeof v.description === 'string' ? v.description : '',
    }));
  return parsed.length > 0 ? parsed : DEFAULT_FEATURES;
}

function Features({ data }: FeaturesProps) {
  const title =
    readString(data, 'title') ||
    'همه‌ی چیزی که برای یه آزمون حرفه‌ای لازم داری';
  const subtitle =
    readString(data, 'subtitle') ||
    'از ساخت سوال تا اعلام نتیجه، بدون هیچ ابزار جانبی.';
  const items = readItems(data);

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="mx-auto mb-14 max-w-xl text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </Reveal>

      <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const Icon = resolveIcon(item.icon);
          return (
            <RevealItem
              key={`${item.title}-${index}`}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-none"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 dark:text-brand-500">
                <Icon size={20} />
              </div>
              <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </section>
  );
}

export default Features;
