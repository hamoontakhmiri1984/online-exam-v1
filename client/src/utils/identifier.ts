// آینه‌ی سمت کلاینتِ server/src/lib/identifier.ts - فقط برای فیدبک آنی تو فرم
// ثبت‌نام (قبل از رفتن به مرحله‌ی بعد)، نه مرجع نهایی. مرجع قطعی همیشه سرورِه؛
// اگه اون قوانین عوض شد، این فایل هم باید هم‌زمان آپدیت بشه.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IRAN_PHONE_REGEX = /^(?:0|98|\+98)?9\d{9}$/;

// ارقام فارسی (۰-۹) و عربی (٠-٩) رو به لاتین تبدیل می‌کنه
export function toLatinDigits(raw: string): string {
  return raw
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    );
}

// true یعنی ورودی ایمیل معتبر یا شماره موبایل ایرانی معتبره
export function isValidIdentifier(raw: string): boolean {
  const value = raw.trim();

  return EMAIL_REGEX.test(value) || IRAN_PHONE_REGEX.test(toLatinDigits(value));
}
