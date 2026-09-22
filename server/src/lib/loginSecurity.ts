// قفل موقت حساب بعد از چند تلاش ناموفق پی‌درپی برای لاگین با پسورد.
// هدف: جلوگیری از brute-force روی پسورد یه حساب خاص (که rate-limiter
// سراسریِ IP به‌تنهایی جلوش رو نمی‌گیره، چون می‌شه از چند IP مختلف زد).
//
// پیاده‌سازی روی Redis (نه دیتابیس) چون این داده موقتیه و باید فوق‌العاده
// سریع خونده/نوشته بشه - هر درخواست لاگین یه بار بهش سر می‌زنه و نباید
// روی سرعت پاسخ‌دهی تاثیر محسوس بذاره.

import { redis } from './redis';
import { durationToSeconds } from './duration';

export const MAX_FAILED_ATTEMPTS = 5;
const FAILED_ATTEMPTS_WINDOW = '15m'; // این مدت از آخرین تلاش ناموفق، شمارنده می‌مونه
const LOCKOUT_DURATION = '15m'; // بعد از قفل شدن، این مدت اجازه‌ی تلاش با پسورد نداره

const failKey = (userId: string) => `login:fail:${userId}`;
const lockKey = (userId: string) => `login:lock:${userId}`;

export async function isAccountLocked(userId: string): Promise<boolean> {
  const locked = await redis.get(lockKey(userId));
  return locked !== null;
}

// یه تلاش ناموفق رو ثبت می‌کنه؛ اگه به سقف رسید خودش قفل می‌کنه.
// خروجی: تعداد تلاش‌های ناموفق فعلی تو همین پنجره‌ی زمانی
export async function registerFailedAttempt(userId: string): Promise<number> {
  const key = failKey(userId);
  const count = await redis.incr(key);
  if (count === 1) {
    // فقط بار اول TTL می‌ذاریم، وگرنه هر INCR دوباره TTL رو ریست می‌کنه
    // و عملاً پنجره‌ی زمانی هیچ‌وقت تموم نمی‌شه
    await redis.expire(key, durationToSeconds(FAILED_ATTEMPTS_WINDOW));
  }

  if (count >= MAX_FAILED_ATTEMPTS) {
    await redis.set(lockKey(userId), '1', {
      EX: durationToSeconds(LOCKOUT_DURATION),
    });
  }

  return count;
}

// بعد از لاگین موفق (یا از هر مسیر دیگه‌ای مثل تایید OTP/گوگل) صدا زده
// می‌شه تا سابقه‌ی تلاش ناموفق پاک بشه
export async function clearFailedAttempts(userId: string): Promise<void> {
  await redis.del(failKey(userId));
  await redis.del(lockKey(userId));
}

// --- کپچای تطبیقی (adaptive/step-up) ---
//
// قبلاً فرم لاگین همیشه کپچا می‌خواست، حتی برای اولین تلاش یه کاربر عادی -
// که هم یه مرحله‌ی اضافه‌ی همیشگیه هم یه درخواست شبکه‌ی اضافه (GET
// /auth/captcha) قبل از این‌که کاربر اصلاً چیزی تایپ کرده باشه.
//
// به‌جاش: کپچا از اول نشون داده نمی‌شه. فقط وقتی از یه IP خاص چندتا تلاش
// ناموفق پشت‌سرهم بیاد (که نشونه‌ی احتمالی اسکریپت/brute-force ـه، نه یه
// آدم که رمزش یادش رفته) کپچا برای همون IP فعال می‌شه - هم برای لاگین با
// رمز، هم برای درخواست OTP (که هزینه‌ی واقعی/پیامکی داره). این کار رو
// خودِ IP انجام می‌ده، نه حساب کاربری، چون این چک باید قبل از این‌که
// بفهمیم شناسه‌ی واردشده اصلاً به یه حساب واقعی می‌خوره یا نه انجام بشه.
const IP_FAIL_TRIGGER = 3; // بعد از این تعداد تلاش ناموفق از یه IP، کپچا اجباری می‌شه
const IP_FAIL_WINDOW = '15m';
const IP_CAPTCHA_DURATION = '30m'; // بعد از فعال شدن، این مدت برای همون IP فعال می‌مونه

const ipFailKey = (ip: string) => `login:ipfail:${ip}`;
const ipCaptchaKey = (ip: string) => `login:ipcaptcha:${ip}`;

export async function isCaptchaRequired(ip: string): Promise<boolean> {
  const flagged = await redis.get(ipCaptchaKey(ip));
  return flagged !== null;
}

// یه تلاش ناموفق (پسورد غلط، حساب پیدا نشد، کپچای غلط) رو برای این IP ثبت
// می‌کنه؛ بعد از رسیدن به سقف، کپچا رو براش فعال می‌کنه
export async function registerIpFailure(ip: string): Promise<void> {
  const key = ipFailKey(ip);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, durationToSeconds(IP_FAIL_WINDOW));
  }
  if (count >= IP_FAIL_TRIGGER) {
    await redis.set(ipCaptchaKey(ip), '1', {
      EX: durationToSeconds(IP_CAPTCHA_DURATION),
    });
  }
}

// بعد از یه لاگین موفق از این IP صدا زده می‌شه. عمداً فقط شمارنده‌ی
// تلاش‌های ناموفق رو پاک می‌کنیم، نه فلگ کپچای فعال‌شده رو - چون اگه IP
// واقعاً داشت brute-force می‌شد، یه لاگین موفق (مثلاً با یه حساب دیگه)
// نباید محافظت بقیه‌ی حساب‌ها رو از همون IP غیرفعال کنه
export async function clearIpFailures(ip: string): Promise<void> {
  await redis.del(ipFailKey(ip));
}
