"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertOtpSendAllowed = assertOtpSendAllowed;
const redis_1 = require("./redis");
const captcha_1 = require("./captcha");
const errors_1 = require("./errors");
const duration_1 = require("./duration");
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
const TOO_MANY_MESSAGE = 'تعداد درخواست کد بیش از حد مجازه. بعداً دوباره تلاش کن.';
const ipKey = (ip) => `otp:send:ip:${ip}`;
const identifierKey = (identifier) => `otp:send:id:${identifier}`;
async function bump(key) {
    const count = await redis_1.redis.incr(key);
    if (count === 1) {
        await redis_1.redis.expire(key, (0, duration_1.durationToSeconds)(WINDOW));
    }
    return count;
}
async function assertOtpSendAllowed(input) {
    const ipCount = await bump(ipKey(input.ip));
    if (ipCount > IP_HARD_LIMIT) {
        throw new errors_1.AppError(429, TOO_MANY_MESSAGE);
    }
    if (ipCount > IP_CAPTCHA_AFTER) {
        if (!input.captchaId || !input.captchaAnswer) {
            throw new errors_1.AppError(400, 'برای ادامه لازمه کد تصویر امنیتی رو هم وارد کنی', { captchaRequired: true });
        }
        const valid = await (0, captcha_1.verifyCaptcha)(input.captchaId, input.captchaAnswer);
        if (!valid) {
            throw new errors_1.AppError(400, 'کد تصویر امنیتی اشتباهه یا منقضی شده', { captchaRequired: true });
        }
    }
    // عمداً بعد از چک کپچا: درخواستی که کپچاش غلطه نباید سهمیه‌ی
    // identifier قربانی رو مصرف کنه (وگرنه می‌شه حساب کسی رو قفل کرد)
    const identifierCount = await bump(identifierKey(input.identifier));
    if (identifierCount > IDENTIFIER_HARD_LIMIT) {
        throw new errors_1.AppError(429, TOO_MANY_MESSAGE);
    }
}
