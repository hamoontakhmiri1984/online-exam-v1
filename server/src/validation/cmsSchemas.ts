import { z } from 'zod';

// بخش‌های قابل‌ویرایشِ صفحه‌ی فرود. این لیست تنها منبعِ معتبرِ اسمِ section
// ـه - هم سمت سرور (GET/PUT /cms/:section زیر همینو چک می‌کنن) هم سمت
// کلاینت (client/src/constants -> همین لیست کپی می‌شه برای ساختِ فرم‌های
// ادمین). اضافه‌کردنِ section جدید یعنی این‌جا اضافه بشه + یه فرم متناظر تو
// پنل ادمین + استفاده‌ازش تو کامپوننتِ مربوطه‌ی صفحه‌ی فرود.
export const SITE_CONTENT_SECTIONS = [
  'hero',
  'about',
  'features',
  'pricing',
  'news',
  'footer',
] as const;

export type SiteContentSection = (typeof SITE_CONTENT_SECTIONS)[number];

export function isSiteContentSection(
  value: string
): value is SiteContentSection {
  return (SITE_CONTENT_SECTIONS as readonly string[]).includes(value);
}

// شکل داخلی data عمداً آزاده (z.record) - هر section شکل خودش رو داره
// (hero یه عنوان/زیرعنوان داره، pricing یه آرایه از پلن) و اعتبارسنجیِ
// دقیق‌ترش (اگه لازم شد) می‌تونه بعداً per-section اضافه بشه؛ همینجا فقط
// مطمئن می‌شیم یه object معتبره (نه آرایه/رشته/عدد خام) تا کلاینت همیشه
// بتونه با Object.entries/بازش کنه
export const updateSiteContentSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});
