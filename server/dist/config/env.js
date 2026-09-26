"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().min(1),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('30d'),
    GOOGLE_CLIENT_ID: zod_1.z.string().min(1),
    PORT: zod_1.z.string().default('4000'),
    NODE_ENV: zod_1.z
        .enum(['development', 'production', 'test'])
        .default('development'),
    KAVENEGAR_API_KEY: zod_1.z.string().default(''),
    RESEND_API_KEY: zod_1.z.string().default(''),
    CLIENT_URL: zod_1.z.string().default('http://localhost:5173'),
    // تعداد proxy (مثل nginx/Cloudflare) بین کاربر و سرور. ۰ یعنی مستقیم (لوکال).
    // پشت proxy باید ۱ (یا بیشتر) باشه، وگرنه req.ip همه‌ی کاربرها یکسان می‌شه و
    // rate-limit و کپچای مبتنی بر IP برای همه با هم اعمال می‌شه
    TRUST_PROXY: zod_1.z.coerce.number().int().min(0).default(0),
    // زرین‌پال: merchant ID واقعی رو از پنل زرین‌پال می‌گیری. تا وقتی مرچنت
    // واقعی نداری، همین مقدار sandbox پیش‌فرض کار می‌کنه چون در حالت sandbox
    // (ZARINPAL_SANDBOX=true) هر مرچنت آیدی معتبری پذیرفته می‌شه.
    ZARINPAL_MERCHANT_ID: zod_1.z
        .string()
        .default('00000000-0000-0000-0000-000000000000'),
    // sandbox یعنی پرداخت واقعی انجام نمی‌شه (محیط تست خودِ زرین‌پال) - قبل از
    // رفتن به production حتماً false بشه
    ZARINPAL_SANDBOX: zod_1.z
        .string()
        .default('true')
        .transform((v) => v === 'true'),
    // آدرس بک‌اند خودمون (نه کلاینت) - زرین‌پال بعد از پرداخت کاربر رو به این
    // آدرس (route کال‌بک ما) برمی‌گردونه، بعد ما خودمون کاربر رو با ریدایرکت
    // به CLIENT_URL می‌فرستیم
    SERVER_URL: zod_1.z.string().default('http://localhost:4000'),
    // Storage (MinIO محلی یا هر S3-compatible دیگه مثل Liara/ArvanCloud/S3
    // واقعی) - کد storage.ts فقط با این envها کار می‌کنه، برای همین سوییچ
    // کردن بین محلی و ابری فقط تغییر همینا رو می‌خواد، نه تغییر کد
    S3_ENDPOINT: zod_1.z.string().default('http://localhost:9000'),
    S3_REGION: zod_1.z.string().default('us-east-1'),
    S3_ACCESS_KEY_ID: zod_1.z.string().default('minioadmin'),
    S3_SECRET_ACCESS_KEY: zod_1.z.string().default('minioadmin'),
    S3_BUCKET: zod_1.z.string().default('exam-platform-uploads'),
    // MinIO (و بیشتر S3-compatible های محلی) به‌جای virtual-hosted style
    // (bucket.endpoint.com) به path-style (endpoint.com/bucket) نیاز دارن -
    // اگه بعداً رفتی رو S3 واقعی/Liara/ArvanCloud که هردو رو ساپورت می‌کنن،
    // می‌تونی بذاریش false یا همون true رو نگه داری، فرقی نمی‌کنه
    S3_FORCE_PATH_STYLE: zod_1.z
        .string()
        .default('true')
        .transform((v) => v === 'true'),
    // مدت اعتبار (ثانیه) هر signed URL که برای پخش ویدیو/دانلود جزوه صادر
    // می‌شه - بعد از این مدت لینک از کار می‌افته و باید دوباره از سرور یکی
    // تازه گرفت (endpoint های .../signed-url تو routes/lessonSessions.ts)
    SIGNED_URL_EXPIRES_IN: zod_1.z
        .string()
        .default('300')
        .transform((v) => parseInt(v, 10)),
    // آدرس عمومیِ خواندنی که تصویرهای بلاگ/CMS ازش سرو می‌شن (بدون signed URL،
    // چون این‌ها برخلاف ویدیو/جزوه از اول قرار بوده عمومی باشن - صفحه‌ی فرود
    // و بلاگ نباید پشت لاگین باشن). یا یه bucket جدا با دسترسیِ خواندنِ عمومی
    // رو همون S3_ENDPOINT، یا یه CDN جلوش. خالی یعنی آپلود تصویر بلاگ/CMS
    // (لایه‌ی publicAssets تو storage.ts) موقع صدا زده‌شدن خطای واضح می‌ده -
    // نه اینکه لینکِ از کار نیفتاده بسازه
    S3_PUBLIC_BASE_URL: zod_1.z.string().default(''),
});
const parsedEnv = envSchema.parse(process.env);
// جلوگیری از اشتباه خطرناک: اگه ZARINPAL_SANDBOX یادمون بره و پیش‌فرض (true)
// روی production بمونه، پرداخت‌ها تو محیط تست زرین‌پال انجام می‌شن و هرکسی
// بدون پرداخت واقعی پلن پولی می‌گیره. پس تو production بدون مرچنت واقعی و
// sandbox=false سرور اصلاً بالا نمیاد.
if (parsedEnv.NODE_ENV === 'production') {
    if (parsedEnv.ZARINPAL_SANDBOX) {
        throw new Error('ZARINPAL_SANDBOX در production باید false باشه (sandbox=true یعنی پرداخت واقعی انجام نمی‌شه)');
    }
    if (parsedEnv.ZARINPAL_MERCHANT_ID === '00000000-0000-0000-0000-000000000000') {
        throw new Error('ZARINPAL_MERCHANT_ID در production باید مرچنت واقعی باشه');
    }
}
exports.env = parsedEnv;
