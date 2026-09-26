"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutLimiter = exports.joinGroupLimiter = exports.captchaLimiter = exports.usernameCheckLimiter = exports.otpVerifyLimiter = exports.otpSendLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// فقط درخواست‌های «ناموفق» شمرده می‌شن (skipSuccessfulRequests) - چون تو یه
// کلاس/مدرسه ده‌ها دانشجو پشت یک IP مشترک همزمان وارد می‌شن و لاگین‌های
// موفق نباید سهمیه‌ی همدیگه رو مصرف کنن
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'تعداد تلاش‌های شما بیش از حد مجاز بود. کمی بعد دوباره امتحان کنید.',
    },
});
// همون ۹۰ ثانیه‌ی شمارنده‌ی «ارسال مجدد» تو کلاینت (RESEND_COOLDOWN_SECONDS)؛
// اگه این عدد از شمارنده بزرگ‌تر باشه، دکمه فعال می‌شه ولی سرور رد می‌کنه
exports.otpSendLimiter = (0, express_rate_limit_1.default)({
    windowMs: 90 * 1000,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.body?.identifier ?? 'unknown'}`,
    message: { error: 'کد قبلی هنوز معتبره. کمی صبر کن و دوباره تلاش کن.' },
});
exports.otpVerifyLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.body?.identifier ?? 'unknown'}`,
    message: { error: 'تعداد تلاش‌های اشتباه بیش از حد مجاز بود.' },
});
// چک آنی دردسترس‌بودن username حین تایپ (debounce شده سمت کلاینت، هر ۴۵۰ms)
// می‌تونه راحت به ده‌ها درخواست در چند دقیقه برسه - نباید زیر سقف مشترک
// authLimiter (که برای لاگین/ثبت‌نام/OTP هست) حساب بشه، وگرنه کاربری که چندبار
// username‌ش رو عوض می‌کنه، سهمیه‌ی کل روتر auth رو مصرف می‌کنه و بعد موقع
// ثبت‌نام/ورود واقعی بلاک می‌شه. این لیمیتر جدا و سبک‌تره: هدفش فقط جلوگیری
// از اسکرپ/enumeration سنگین username هاست، نه محدود کردن تایپ عادی کاربر.
exports.usernameCheckLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'تعداد درخواست‌ها بیش از حد مجاز بود. کمی صبر کن.' },
});
// گرفتن یه تصویر کپچای جدید (مثلاً با زدن دکمه‌ی «چالش جدید») - همون منطق
// usernameCheckLimiter: نباید سهمیه‌ی مشترک authLimiter رو مصرف کنه
exports.captchaLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'تعداد درخواست‌ها بیش از حد مجاز بود. کمی صبر کن.' },
});
// حدس‌زدن کد عضویت (۶ کاراکتر از ۳۲ نماد): فقط تلاش‌های ناموفق (کد نامعتبر)
// شمرده می‌شن و کلید per-user ـه، نه per-IP، چون تو مدرسه/کلاس ده‌ها دانشجو
// پشت یه IP مشترک هستن و عضویت موفق نباید سهمیه‌ی همدیگه رو بسوزونه
exports.joinGroupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
    message: {
        error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز بود. کمی بعد دوباره امتحان کن.',
    },
});
// شروع پرداخت برای هر مدرس: هر درخواست یه Payment(Pending) و یه فراخوانی به
// زرین‌پال می‌سازه؛ سقف per-user جلوی انباشته‌شدن ردیف و فشار روی درگاه رو
// می‌گیره
exports.checkoutLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
    message: {
        error: 'تعداد درخواست‌های پرداخت بیش از حد مجاز بود. کمی بعد دوباره امتحان کن.',
    },
});
