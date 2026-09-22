export function toEmbedUrl(url: string): string {
  const trimmed = url.trim();

  // یوتیوب: watch?v=, youtu.be/, shorts/ و live/ رو هم پوشش می‌ده
  // (قبلاً فقط watch?v= و youtu.be/ رو می‌گرفت)
  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]+)/
  );
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  // آپارات: فرمت واقعیِ لینکِ اشتراک‌گذاری «aparat.com/v/CODE» هست، نه
  // «aparat.com/video/CODE» (باگ اصلیِ پخش نشدنِ ویدیو همینجا بود - این
  // regex هیچ‌وقت match نمی‌شد و لینک خام مستقیم می‌رفت تو iframe).
  // فرمت /video/ رو هم برای سازگاری با لینک‌هایی که قبلاً به این شکل وارد
  // شدن نگه داشتیم.
  const aparatMatch = trimmed.match(/aparat\.com\/(?:v|video)\/([\w-]+)/);
  if (aparatMatch)
    return `https://www.aparat.com/video/embed/${aparatMatch[1]}`;

  // هر چیز دیگه‌ای فقط اگه لینک http/https معتبر باشه تو iframe می‌ره؛
  // ردیف‌های قدیمی مثل javascript:/data: (قبل از اعتبارسنجی سرور ذخیره
  // شده‌ان) خالی برمی‌گردن و پلیر پیام «لینک نامعتبر» نشون می‌ده. لینک بدون
  // scheme هم مثل سرور با https:// کامل می‌شه
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return withScheme;
    }
  } catch {
    // نامعتبر - پایین خالی برمی‌گرده
  }
  return '';
}
