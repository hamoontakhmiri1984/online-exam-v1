// تشخیص می‌ده ورودی ایمیله یا شماره موبایل، و یه نسخه‌ی نرمالایز شده برمی‌گردونه
// (چون کاربر ممکنه 09121234567 یا +989121234567 وارد کنه - باید یکی بشن که
// تو DB و OTP به یه چیز یکسان اشاره کنن)

export type IdentifierType = 'EMAIL' | 'PHONE';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IRAN_PHONE_REGEX = /^(?:0|98|\+98)?9\d{9}$/;

// ارقام فارسی (۰-۹) و عربی (٠-٩) رو به لاتین تبدیل می‌کنه؛ کاربر با کیبورد
// فارسی شماره‌ش رو با همین ارقام می‌زنه و regexهای بالا فقط رقم لاتین می‌شناسن
export function toLatinDigits(raw: string): string {
  return raw
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    );
}

export function detectIdentifierType(raw: string): IdentifierType | null {
  const value = raw.trim();
  if (EMAIL_REGEX.test(value)) return 'EMAIL';
  if (IRAN_PHONE_REGEX.test(toLatinDigits(value))) return 'PHONE';
  return null;
}

// همه‌چیز رو به فرمت 09xxxxxxxxx نرمالایز می‌کنه تا تو DB یکتا و قابل مقایسه باشه
export function normalizeIdentifier(raw: string, type: IdentifierType): string {
  const value = raw.trim();
  if (type === 'EMAIL') return value.toLowerCase();

  const digits = toLatinDigits(value)
    .replace(/^\+?98/, '0')
    .replace(/^98/, '0');
  return digits.startsWith('0') ? digits : `0${digits}`;
}
