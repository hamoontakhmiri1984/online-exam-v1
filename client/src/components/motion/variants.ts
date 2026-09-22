import type { Variants } from 'framer-motion';

// این فایل تنها منبعِ variant های framer-motion تو کل پروژه‌ست - جای
// این‌که هر کامپوننت خودش یه انیمیشنِ جدا تعریف کنه، همه از همین‌ها
// استفاده می‌کنن تا حس‌وحالِ حرکت تو کل سایت یکدست بمونه.

// ورودِ ساده‌ی fade + slide-up، برای عنوانِ section ها و تکی-آیتم‌ها
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

// نسخه‌ی خیلی ظریف‌تر - برای چیزهایی که نباید خیلی جلبِ توجه کنن
// (مثل بک‌گراند یا کارتِ کنارِ متنِ اصلی)
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

// کانتینرِ استگر - روی والد گذاشته می‌شه، بچه‌ها با فاصله‌ی زمانی از هم
// وارد می‌شن (برای گریدِ کارت‌ها: Features/About/Pricing/News)
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

// آیتمِ داخلِ یه staggerContainer
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

// ورود/خروجِ منوهای کشویی، پنل‌های موبایل، dropdown ها
export const collapseFade: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.28, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ترانزیشنِ بینِ صفحات (AppRoutes) - محو و یه سُرشِ خیلی کم، نه چیزیِ
// اغراق‌شده که حسِ کندی بده
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};
