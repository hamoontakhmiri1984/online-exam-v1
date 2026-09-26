"use strict";
// قوانین نام‌کاربری (username):
// - فقط حروف انگلیسی (بدون حساسیت به بزرگ/کوچیک)، عدد، نقطه و آندرلاین
// - باید با حرف انگلیسی شروع بشه
// - طول ۴ تا ۲۰ کاراکتر
// - نمی‌تونه شبیه ایمیل یا شماره موبایل باشه (که با تشخیص نوع identifier
//   تو login/register قاطی نشه)
// - اسم‌های رزروشده (نقش‌های سیستمی و مشابه) و کلمات نامتعارف مجاز نیست
// - یکتایی و لاگین case-insensitive انجام می‌شه (نسخه‌ی lower-case مرجعه)
//
// نکته: این فایل باید هم‌زمان با client/src/utils/username.ts سینک بمونه -
// اونجا همین قوانین برای فیدبک آنی سمت کاربر (قبل از رفتن به سرور) تکرار
// شده، ولی مرجع نهایی و تنها منبع قابل‌اعتماد برای اعتبارسنجی همین فایله.
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERNAME_MAX_LENGTH = exports.USERNAME_MIN_LENGTH = void 0;
exports.normalizeUsername = normalizeUsername;
exports.validateUsernameFormat = validateUsernameFormat;
exports.isUsernameTaken = isUsernameTaken;
exports.suggestUsernameAlternatives = suggestUsernameAlternatives;
const identifier_1 = require("./identifier");
const prisma_1 = require("./prisma");
exports.USERNAME_MIN_LENGTH = 4;
exports.USERNAME_MAX_LENGTH = 20;
// حرف شروع، بعدش هر ترکیبی از حرف/عدد/نقطه/آندرلاین، ولی نه دوتا نقطه/آندرلاین
// پشت‌سرهم و نه پایان‌یافتن با نقطه/آندرلاین
const USERNAME_FORMAT_REGEX = /^[a-zA-Z](?!.*[_.]{2})[a-zA-Z0-9_.]*[a-zA-Z0-9]$/;
// اسم‌های سیستمی/نقش‌ها که اگه آزاد باشن می‌تونن باعث جازدن کاربر به‌جای
// ادمین/پشتیبانی و... بشن. با حروف کوچیک نگه‌داری می‌شه چون مقایسه روی
// نسخه‌ی normalize شده انجام می‌گیره.
const RESERVED_USERNAMES = new Set([
    'admin',
    'administrator',
    'superadmin',
    'super_admin',
    'root',
    'support',
    'moderator',
    'mod',
    'system',
    'staff',
    'official',
    'owner',
    'webmaster',
    'security',
    'help',
    'info',
    'contact',
    'api',
    'null',
    'undefined',
    'test',
    'teacher',
    'instructor',
    'student',
    'guest',
    'anonymous',
    'user',
    'users',
    'me',
    'settings',
    'account',
    'login',
    'logout',
    'signup',
    'register',
]);
// لیست پایه‌ی زیررشته‌های نامتعارف/توهین‌آمیز که به‌عنوان username رد می‌شن.
// این یه فیلتر کامل محتوا نیست، فقط جلوی رایج‌ترین سوءاستفاده‌ها رو می‌گیره؛
// در صورت نیاز بعداً قابل گسترشه (مثلاً از یه فایل/جدول جدا لود بشه).
const INAPPROPRIATE_SUBSTRINGS = [
    'fuck',
    'shit',
    'bitch',
    'asshole',
    'pussy',
    'dick',
    'cunt',
    'whore',
    'slut',
    'porn',
    'nigger',
    'faggot',
    'rape',
    'kir',
    'kos',
    'jende',
    'koon',
    'gooh',
    'madarjende',
    'pedarsag',
];
function normalizeUsername(raw) {
    return raw.trim().toLowerCase();
}
function validateUsernameFormat(raw) {
    const value = raw.trim();
    if (value.length < exports.USERNAME_MIN_LENGTH ||
        value.length > exports.USERNAME_MAX_LENGTH) {
        return {
            valid: false,
            error: `نام کاربری باید بین ${exports.USERNAME_MIN_LENGTH} تا ${exports.USERNAME_MAX_LENGTH} کاراکتر باشه`,
        };
    }
    if (!USERNAME_FORMAT_REGEX.test(value)) {
        return {
            valid: false,
            error: 'نام کاربری باید با حرف انگلیسی شروع بشه و فقط شامل حروف/عدد انگلیسی، نقطه و آندرلاین باشه (بدون تکرار پشت‌سرهم یا پایان با نقطه/آندرلاین)',
        };
    }
    // احتیاط اضافه: نباید شبیه ایمیل یا شماره موبایل باشه، وگرنه resolveIdentifier
    // تو auth.ts نمی‌تونه تشخیص بده کاربر می‌خواد با username وارد بشه یا identifier دیگه
    if ((0, identifier_1.detectIdentifierType)(value)) {
        return {
            valid: false,
            error: 'نام کاربری نمی‌تونه شبیه ایمیل یا شماره موبایل باشه',
        };
    }
    const normalized = normalizeUsername(value);
    if (RESERVED_USERNAMES.has(normalized)) {
        return {
            valid: false,
            error: 'این نام کاربری رزرو شده و قابل استفاده نیست',
        };
    }
    if (INAPPROPRIATE_SUBSTRINGS.some((word) => normalized.includes(word))) {
        return { valid: false, error: 'این نام کاربری مجاز نیست' };
    }
    return { valid: true };
}
// آیا این نام‌کاربری (نرمالایز شده) رو کس دیگه‌ای غیر از excludeUserId گرفته؟
async function isUsernameTaken(usernameNormalized, excludeUserId) {
    const existing = await prisma_1.prisma.user.findUnique({
        where: { usernameNormalized },
    });
    if (!existing)
        return false;
    return existing.id !== excludeUserId;
}
// وقتی username موردنظر گرفته شده، چند جایگزین در دسترس پیشنهاد می‌ده
// (مثلاً ali -> ali42, ali_7, ali123). صرفاً یه کمک UX ـه، اجباری نیست.
async function suggestUsernameAlternatives(rawBase, count = 3) {
    const cleanedBase = normalizeUsername(rawBase).replace(/[^a-z0-9_.]/g, '');
    // ۴ کاراکتر جا برای پسوند نگه می‌داریم تا از حداکثر طول رد نشه
    const base = cleanedBase.slice(0, Math.max(1, exports.USERNAME_MAX_LENGTH - 4));
    const suggestions = [];
    let guard = 0;
    while (suggestions.length < count && guard < 20) {
        guard++;
        const suffix = guard % 2 === 0
            ? String(Math.floor(10 + Math.random() * 90)) // ۲ رقمی
            : `_${Math.floor(1 + Math.random() * 9)}`;
        const candidate = `${base}${suffix}`;
        if (candidate.length < exports.USERNAME_MIN_LENGTH)
            continue;
        if (suggestions.includes(candidate))
            continue;
        const taken = await isUsernameTaken(candidate);
        if (!taken)
            suggestions.push(candidate);
    }
    return suggestions;
}
