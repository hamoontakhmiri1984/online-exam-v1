export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthResult = {
  level: PasswordStrengthLevel;
  label: string;
  colorClass: string;
};

const LABELS: Record<PasswordStrengthLevel, string> = {
  0: 'خیلی ضعیف',
  1: 'ضعیف',
  2: 'متوسط',
  3: 'قوی',
  4: 'خیلی قوی',
};

const COLORS: Record<PasswordStrengthLevel, string> = {
  0: 'bg-danger-500',
  1: 'bg-danger-400',
  2: 'bg-amber-400',
  3: 'bg-brand-400',
  4: 'bg-emerald-500',
};

/**
 * تخمین ساده و سبک از قدرت رمز عبور، بدون وابستگی به کتابخونه‌ی خارجی.
 * فقط برای راهنمایی بصری کاربره؛ اعتبارسنجی نهایی رمز همیشه سمت سرور انجام می‌شه.
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { level: 0, label: LABELS[0], colorClass: COLORS[0] };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password) || /[A-Z]/.test(password)) score += 1;

  const level = Math.min(score, 4) as PasswordStrengthLevel;
  return { level, label: LABELS[level], colorClass: COLORS[level] };
}
