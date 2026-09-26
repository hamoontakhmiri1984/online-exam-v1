"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROTATE_SESSION_SCRIPT = void 0;
exports.withSessionStore = withSessionStore;
exports.createSession = createSession;
exports.getActiveSessionId = getActiveSessionId;
exports.isSessionValid = isSessionValid;
exports.rotateSessionWithGrace = rotateSessionWithGrace;
exports.revokeSession = revokeSession;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("./redis");
const env_1 = require("../config/env");
const duration_1 = require("./duration");
const errors_1 = require("./errors");
const sessionKey = (userId) => `session:${userId}`;
// hash: «sid قدیمی» -> «sid جدیدی که موقع rotate جاش اومد». نام کلید عمداً با
// کلید string قدیمیِ `session:<id>:grace` فرق داره تا روی Redis ای که هنوز
// کلید قدیمی توش مونده (نوع متفاوت) خطای WRONGTYPE نده
const rotatedKey = (userId) => `session:${userId}:rotated`;
const REFRESH_TTL_SECONDS = (0, duration_1.durationToSeconds)(env_1.env.JWT_REFRESH_EXPIRES_IN);
// بعد از rotate شدن sid (موقع /auth/refresh)، sid قبلی برای این مدت کوتاه هم
// هنوز معتبر حساب می‌شه. این فقط برای رفع رِیس بین چند تب/درخواست هم‌زمانِ
// *همون* کاربره (مثلاً ۲ تب که هر دو access token‌شون هم‌زمان expire شده و
// هر دو به /auth/refresh زدن) - نه برای ضعیف کردن مدل تک‌نشستی: لاگین واقعی
// از یه دستگاه دیگه از createSession استفاده می‌کنه که این نگاشت رو هم پاک
// می‌کنه، پس همچنان فوری و بدون مهلت نشست‌های دیگه رو باطل می‌کنه.
const GRACE_WINDOW_SECONDS = 10;
// خطای «مخزن نشست (Redis) در دسترس نیست». عمداً AppError با ۵۰۳ ـه، نه یه
// خطای عمومی: تا وقتی Redis قطع/کنده، «نمی‌دونیم نشست معتبره یا نه» و این با
// «نشست باطله» (۴۰۱) فرق داره. اگه ۴۰۱ برمی‌گشت کلاینت فکر می‌کرد نشست تموم
// شده و همه‌ی کاربرها با یه قطعیِ چند‌ثانیه‌ایِ Redis از سیستم خارج می‌شدن.
// timeout هم لازمه چون node-redis وقتی قطعه فرمان‌ها رو تو صف نگه می‌داره و
// تا وصل شدنِ دوباره درخواست معلق می‌مونه
const SESSION_STORE_TIMEOUT_MS = 2_000;
async function withSessionStore(op) {
    let timer;
    try {
        return await Promise.race([
            op(),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('session store timeout')), SESSION_STORE_TIMEOUT_MS);
            }),
        ]);
    }
    catch (err) {
        console.error('session store unavailable:', err);
        throw new errors_1.AppError(503, 'سرویس نشست موقتاً در دسترس نیست');
    }
    finally {
        clearTimeout(timer);
    }
}
async function createSession(userId) {
    const sessionId = crypto_1.default.randomUUID();
    // یه لاگین واقعیِ جدید باید قاطع باشه - اگه یه نگاشتِ rotate قدیمی مونده
    // باشه، اینجا پاکش می‌کنیم وگرنه نشستِ دستگاه قبلی می‌تونست تا پایان اون
    // grace هنوز کار کنه
    await withSessionStore(() => Promise.all([
        redis_1.redis.set(sessionKey(userId), sessionId, { EX: REFRESH_TTL_SECONDS }),
        redis_1.redis.del(rotatedKey(userId)),
    ]));
    return sessionId;
}
async function getActiveSessionId(userId) {
    return withSessionStore(() => redis_1.redis.get(sessionKey(userId)));
}
async function isSessionValid(userId, sessionId) {
    const active = await getActiveSessionId(userId);
    if (active !== null && active === sessionId)
        return true;
    // شاید این sid همین چند ثانیه پیش با یه refresh دیگه (از یه تب دیگه‌ی
    // همین کاربر) rotate شده - در این صورت هنوز داخل grace window معتبره
    const replacedBy = await withSessionStore(() => redis_1.redis.hGet(rotatedKey(userId), sessionId));
    return typeof replacedBy === 'string' && replacedBy.length > 0;
}
// rotate اتمیک و idempotent برای /auth/refresh. کل منطق داخل یه Lua script
// اجرا می‌شه (Redis هر script رو بدون وقفه اجرا می‌کنه)، پس بین «خوندن sid
// فعلی» و «نوشتن sid جدید» هیچ درخواست دیگه‌ای (رفرش هم‌زمان، لاگین از
// دستگاه دیگه، logout) نمی‌تونه وسط بیفته:
//   ۱) اگه sid درخواست همون sid فعلیه: sid جدید ساخته و فعلی می‌شه، و
//      نگاشتِ «قدیمی -> جدید» تا GRACE_WINDOW_SECONDS نگه داشته می‌شه
//   ۲) اگه این sid همین چند ثانیه پیش با یه رفرشِ دیگه rotate شده: sid
//      *فعلیِ* نشست برگردونده می‌شه (نه یه sid تازه!). قبلاً هر درخواستِ
//      هم‌زمان یه sid جدید می‌ساخت و دومی توکنِ اولی رو باطل می‌کرد.
//      «فعلی» و نه مقدارِ نگاشتِ خودِ اون sid: اگه بین‌راه دوباره rotate شده
//      باشه (A→B→C)، نگاشتِ A→B هنوز هست ولی B دیگه فعال نیست و برگردوندنش
//      کلاینت رو با یه sid مرده تنها می‌ذاشت. نگاشتِ rotate با createSession/
//      revokeSession پاک می‌شه، پس هر sid داخلش حتماً از همین نشسته‌ی فعلیه
//   ۳) وگرنه (نشست باطل/logout/لاگین از دستگاه دیگه): null
//
// KEYS[1]=کلید sid فعلی  KEYS[2]=هش نگاشت rotate
// ARGV[1]=sid درخواست  ARGV[2]=sid جدیدِ کاندید  ARGV[3]=TTL نشست  ARGV[4]=TTL grace
exports.ROTATE_SESSION_SCRIPT = `
local active = redis.call('GET', KEYS[1])
if active == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[4]))
  return ARGV[2]
end
if active and redis.call('HEXISTS', KEYS[2], ARGV[1]) == 1 then
  return active
end
return false
`;
// sid جدیدِ نشست رو برمی‌گردونه، یا null اگه sid درخواست دیگه معتبر نیست
async function rotateSessionWithGrace(userId, currentSessionId) {
    const candidateSessionId = crypto_1.default.randomUUID();
    const result = await withSessionStore(() => redis_1.redis.eval(exports.ROTATE_SESSION_SCRIPT, {
        keys: [sessionKey(userId), rotatedKey(userId)],
        arguments: [
            currentSessionId,
            candidateSessionId,
            String(REFRESH_TTL_SECONDS),
            String(GRACE_WINDOW_SECONDS),
        ],
    }));
    return typeof result === 'string' && result.length > 0 ? result : null;
}
async function revokeSession(userId) {
    await withSessionStore(() => Promise.all([
        redis_1.redis.del(sessionKey(userId)),
        redis_1.redis.del(rotatedKey(userId)),
    ]));
}
