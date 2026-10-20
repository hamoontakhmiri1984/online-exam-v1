// قفل موقت حساب بعد از چند تلاش ناموفق پی‌درپی برای لاگین با پسورد.
// هدف: جلوگیری از brute-force روی پسورد یه حساب خاص (که rate-limiter
// سراسریِ IP به‌تنهایی جلوش رو نمی‌گیره، چون می‌شه از چند IP مختلف زد).
//
// پیاده‌سازی روی Redis (نه دیتابیس) چون این داده موقتیه و باید فوق‌العاده
// سریع خونده/نوشته بشه - هر درخواست لاگین یه بار بهش سر می‌زنه و نباید
// روی سرعت پاسخ‌دهی تاثیر محسوس بذاره.

import { redis } from './redis';
import { durationToSeconds } from './duration';

// قفل دو لایه دارد:
//  - هر (حساب + IP): بعد از MAX_FAILED_ATTEMPTS تلاش ناموفق فقط همان IP قفل
//    می‌شود، پس یک مهاجم نمی‌تواند صاحب حساب را از IP خودش بیرون بیندازد.
//  - هر حساب (از همه‌ی IPها): سقف بالاتر MAX_FAILED_ATTEMPTS_ANY_IP برای
//    جلوگیری از brute-force پخش‌شده روی چند IP.
export const MAX_FAILED_ATTEMPTS = 5;
export const MAX_FAILED_ATTEMPTS_ANY_IP = 30;
const FAILED_ATTEMPTS_WINDOW = '15m'; // این مدت از اولین تلاش ناموفق، شمارنده می‌مونه
const LOCKOUT_DURATION = '15m'; // بعد از قفل شدن، این مدت اجازه‌ی تلاش با پسورد نداره
const GENERATION_TTL_SECONDS = 7 * 24 * 60 * 60;

const failKey = (userId: string) => `login:fail:${userId}`;
const lockKey = (userId: string) => `login:lock:${userId}`;
// generation: با هر پاک‌سازی (clearFailedAttempts) یکی زیاد می‌شه تا کلیدهای
// IP-محورِ قبلی بدون نیاز به scan بی‌اثر بشن
const generationKey = (userId: string) => `login:gen:${userId}`;
const accountIpFailKey = (userId: string, generation: string, ip: string) =>
  `login:fail:${userId}:${generation}:${ip}`;
const accountIpLockKey = (userId: string, generation: string, ip: string) =>
  `login:lock:${userId}:${generation}:${ip}`;

// INCR + EXPIRE اتمیک (اگه وسطشون سرور بیفته، کلید بدون TTL نمی‌مونه)
const INCR_WITH_TTL_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return count
`;

async function incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
  const count = await redis.eval(INCR_WITH_TTL_SCRIPT, {
    keys: [key],
    arguments: [String(ttlSeconds)],
  });
  return Number(count);
}

async function currentGeneration(userId: string): Promise<string> {
  return (await redis.get(generationKey(userId))) ?? '0';
}

export async function isAccountLocked(
  userId: string,
  ip = 'unknown'
): Promise<boolean> {
  const generation = await currentGeneration(userId);
  const [anyIpLock, thisIpLock] = await Promise.all([
    redis.get(lockKey(userId)),
    redis.get(accountIpLockKey(userId, generation, ip)),
  ]);
  return anyIpLock !== null || thisIpLock !== null;
}

// یه تلاش ناموفق رو ثبت می‌کنه؛ اگه به سقف رسید خودش قفل می‌کنه.
// خروجی: تعداد تلاش‌های ناموفق این IP برای این حساب تو همین پنجره‌ی زمانی
export async function registerFailedAttempt(
  userId: string,
  ip = 'unknown'
): Promise<number> {
  const generation = await currentGeneration(userId);
  const windowSeconds = durationToSeconds(FAILED_ATTEMPTS_WINDOW);
  const lockSeconds = durationToSeconds(LOCKOUT_DURATION);

  const [ipCount, totalCount] = await Promise.all([
    incrWithTtl(accountIpFailKey(userId, generation, ip), windowSeconds),
    incrWithTtl(failKey(userId), windowSeconds),
  ]);

  if (ipCount >= MAX_FAILED_ATTEMPTS) {
    await redis.set(accountIpLockKey(userId, generation, ip), '1', {
      EX: lockSeconds,
    });
  }
  if (totalCount >= MAX_FAILED_ATTEMPTS_ANY_IP) {
    await redis.set(lockKey(userId), '1', { EX: lockSeconds });
  }

  return ipCount;
}

// بعد از لاگین موفق (یا از هر مسیر دیگه‌ای مثل ریست رمز) صدا زده
// می‌شه تا سابقه‌ی تلاش ناموفق (همه‌ی IPها) پاک بشه
export async function clearFailedAttempts(userId: string): Promise<void> {
  await redis.del([failKey(userId), lockKey(userId)]);
  await redis.incr(generationKey(userId));
  await redis.expire(generationKey(userId), GENERATION_TTL_SECONDS);
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
  const count = await incrWithTtl(
    ipFailKey(ip),
    durationToSeconds(IP_FAIL_WINDOW)
  );
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