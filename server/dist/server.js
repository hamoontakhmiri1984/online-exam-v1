"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const env_1 = require("./config/env");
const prisma_1 = require("./lib/prisma");
const redis_1 = require("./lib/redis");
const socket_1 = require("./realtime/socket");
const attemptFinalize_1 = require("./lib/attemptFinalize");
const payments_1 = require("./lib/payments");
const auth_1 = __importDefault(require("./routes/auth"));
const groups_1 = __importDefault(require("./routes/groups"));
const students_1 = __importDefault(require("./routes/students"));
const lessonSessions_1 = __importDefault(require("./routes/lessonSessions"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const exams_1 = __importDefault(require("./routes/exams"));
const questionBanks_1 = __importDefault(require("./routes/questionBanks"));
const examAttempts_1 = __importDefault(require("./routes/examAttempts"));
const myAttempts_1 = __importDefault(require("./routes/myAttempts"));
const questions_1 = __importDefault(require("./routes/questions"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const categories_1 = __importDefault(require("./routes/categories"));
const handouts_1 = __importDefault(require("./routes/handouts"));
const admin_1 = __importDefault(require("./routes/admin"));
const blog_1 = __importDefault(require("./routes/blog"));
const cms_1 = __importDefault(require("./routes/cms"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// نکته: این چهارتا باید قبل از هر روتی بیان، وگرنه اون روت نه بدنه‌ی JSON
// می‌بینه، نه هدرهای CORS/امنیتی روش اعمال می‌شه (باگی که تو نسخه‌ی قبلی
// examsRouter قبل از این‌ها mount شده بود و همین مشکل رو داشت)
if (env_1.env.TRUST_PROXY > 0) {
    app.set('trust proxy', env_1.env.TRUST_PROXY);
}
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.CLIENT_URL, credentials: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.get('/health', async (_req, res) => {
    await prisma_1.prisma.$queryRaw `SELECT 1`;
    await redis_1.redis.ping();
    res.json({ status: 'ok' });
});
// دیگه هیچ فایلی رو دیسک سرور نگه‌داری/استاتیک سرو نمی‌شه - ویدیو/جزوه‌ها
// تو MinIO/S3 (lib/storage.ts) هستن و فقط با signed URL موقت (بعد از چک
// دسترسی، از routes/lessonSessions.ts) قابل‌دیدن‌ان. برای همین app.use('/uploads', express.static(...))
// قبلی این‌جا کامل حذف شد.
app.use('/auth', auth_1.default);
app.use('/groups', groups_1.default);
app.use('/students', students_1.default);
app.use('/lesson-sessions', lessonSessions_1.default);
app.use('/uploads', uploads_1.default);
app.use('/notifications', notifications_1.default);
app.use('/subscriptions', subscriptions_1.default);
app.use('/categories', categories_1.default);
app.use('/handouts', handouts_1.default);
app.use('/admin', admin_1.default);
// این دوتا برخلاف بقیه (behind requireAuth تو خیلی از sub-route هاشون) از
// اول باید بخشِ GET عمومیِ بدون توکن داشته باشن - صفحه‌ی فرود و بلاگ باید
// بدون لاگین قابل‌دیدن باشن؛ requireAuth+requireRole فقط رو زیرمسیر
// /admin/... همین دو router اعمال می‌شه (خودِ فایل‌هاشون)
app.use('/blog', blog_1.default);
app.use('/cms', cms_1.default);
// مسیرِ مستقل از examId - تاریخچه‌ی خودِ دانشجو رو مستقیم رو studentId
// می‌گیره (routes/myAttempts.ts)، نه از زیرِ یه آزمونِ خاص
app.use('/attempts', myAttempts_1.default);
app.use('/exams/:examId/attempts', examAttempts_1.default);
// این روت (routes/questions.ts) از قبل کامل نوشته شده بود - سوالاتِ
// خودِ آزمون (ExamQuestion) + ایمپورت از بانک سوال (from-bank) - ولی
// اینجا هیچ‌وقت mount نشده بود، برای همین GET/POST به
// /exams/:examId/questions همیشه 404 می‌داد (دقیقاً همون خطای
// «دریافت سوال‌ها با خطا مواجه شد» که تو صفحه‌ی سوالاتِ یه آزمون می‌دیدی)
app.use('/exams/:examId/questions', questions_1.default);
app.use('/banks', questionBanks_1.default);
app.use('/exams', exams_1.default);
// این دوتا باید آخرِ همه‌ی route ها بیان: notFoundHandler برای مسیری که هیچ
// router‌ای match نکرده، errorHandler (چهار پارامتری) برای هر throw/next(err)
// که تو کل زنجیره بالا اتفاق بیفته - از جمله چیزهایی که asyncHandler می‌گیره
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
(0, socket_1.initSocket)(httpServer);
httpServer.listen(env_1.env.PORT, () => {
    console.log(`server running on port ${env_1.env.PORT}`);
    (0, attemptFinalize_1.startAttemptSweeper)();
    (0, payments_1.startPaymentReconciler)();
});
