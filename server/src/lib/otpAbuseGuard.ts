import { redis } from './redis';
import { verifyCaptcha } from './captcha';
import { AppError } from './errors';
import { durationToSeconds } from './duration';

// محافظت از «ارسال OTP» (که هزینه‌ی واقعی/پیامکی داره) در برابر SMS pumping
// و بمباران یک شماره/ایمیل.
//
// otpSendLimiter (تو rateLimiters.ts) فقط کلید `ip:identifier` رو محدود
// می‌کنه؛ یعنی یه اسکریپت از یه IP می‌تونه با identifier های مختلف نامحدود
// OTP بفرسته. این گارد سه لایه‌ی مکمل اضافه می‌کنه:
//   ۱) سقف سخت per-IP (بالا، چون تو مدرسه/کلاس چندین دانشجو پشت یه IP ان)
//   ۲) کپچای تطبیقی: بعد از چند درخواست از یه IP، کپچا اجباری می‌شه
//   ۳) سقف per-identifier مستقل از IP (جلوی بمباران یه شماره از IP های مختلف)

const WINDOW = '1h';
const IP_CAPTCHA_AFTER = 5; // از درخواست ششم به بعد در هر ساعت، کپچا لازمه
const IP_HARD_LIMIT = 60; // سقف مطلق درخواست OTP در ساعت برای یه IP
const IDENTIFIER_HARD_LIMIT = 8; // سقف OTP در ساعت برای یه ایمیل/شماره

const TOO_MANY_MESSAGE =
  'تعداد درخواست کد بیش از حد مجازه. بعداً دوباره تلاش کن.';

const ipKey = (ip: string) => `otp:send:ip:${ip}`;
const identifierKey = (identifier: string) =>
  `otp:send:id:${identifier}`;

async function bump(key: string): Promise<number> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, durationToSeconds(WINDOW));
  }
  return count;
}

export type OtpSendGuardInput = {
  ip: string;
  // شناسه‌ی نرمال‌شده (خروجی resolveIdentifier)، نه ورودی خام کاربر
  identifier: string;
  captchaId?: string;
  captchaAnswer?: string;
};

export async function assertOtpSendAllowed(
  input: OtpSendGuardInput,
): Promise<void> {
  const ipCount = await bump(ipKey(input.ip));

  if (ipCount > IP_HARD_LIMIT) {
    throw new AppError(429, TOO_MANY_MESSAGE);
  }

  if (ipCount > IP_CAPTCHA_AFTER) {
    if (!input.captchaId || !input.captchaAnswer) {
      throw new AppError(
        400,
        'برای ادامه لازمه کد تصویر امنیتی رو هم وارد کنی',
        { captchaRequired: true },
      );
    }

    const valid = await verifyCaptcha(
      input.captchaId,
      input.captchaAnswer,
    );

    if (!valid) {
      throw new AppError(
        400,
        'کد تصویر امنیتی اشتباهه یا منقضی شده',
        { captchaRequired: true },
      );
    }
  }

  // عمداً بعد از چک کپچا: درخواستی که کپچاش غلطه نباید سهمیه‌ی
  // identifier قربانی رو مصرف کنه (وگرنه می‌شه حساب کسی رو قفل کرد)
  const identifierCount = await bump(
    identifierKey(input.identifier),
  );

  if (identifierCount > IDENTIFIER_HARD_LIMIT) {
    throw new AppError(429, TOO_MANY_MESSAGE);
  }
}
