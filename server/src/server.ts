// server/src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { initSocket } from './realtime/socket';
import { startAttemptSweeper } from './lib/attemptFinalize';
import { startPaymentReconciler } from './lib/payments';
import authRouter from './routes/auth';
import groupsRouter from './routes/groups';
import studentsRouter from './routes/students';
import lessonSessionsRouter from './routes/lessonSessions';
import uploadsRouter from './routes/uploads';
import examsRouter from './routes/exams';
import questionBanksRouter from './routes/questionBanks';
import examAttemptsRouter from './routes/examAttempts';
import myAttemptsRouter from './routes/myAttempts';
import examQuestionsRouter from './routes/questions';
import notificationsRouter from './routes/notifications';
import subscriptionsRouter from './routes/subscriptions';
import categoriesRouter from './routes/categories';
import handoutsRouter from './routes/handouts';
import adminRouter from './routes/admin';
import blogRouter from './routes/blog';
import cmsRouter from './routes/cms';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const httpServer = createServer(app);

// نکته: این چهارتا باید قبل از هر روتی بیان، وگرنه اون روت نه بدنه‌ی JSON
// می‌بینه، نه هدرهای CORS/امنیتی روش اعمال می‌شه (باگی که تو نسخه‌ی قبلی
// examsRouter قبل از این‌ها mount شده بود و همین مشکل رو داشت)
if (env.TRUST_PROXY > 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  await redis.ping();
  res.json({ status: 'ok' });
});

// دیگه هیچ فایلی رو دیسک سرور نگه‌داری/استاتیک سرو نمی‌شه - ویدیو/جزوه‌ها
// تو MinIO/S3 (lib/storage.ts) هستن و فقط با signed URL موقت (بعد از چک
// دسترسی، از routes/lessonSessions.ts) قابل‌دیدن‌ان. برای همین app.use('/uploads', express.static(...))
// قبلی این‌جا کامل حذف شد.

app.use('/auth', authRouter);
app.use('/groups', groupsRouter);
app.use('/students', studentsRouter);
app.use('/lesson-sessions', lessonSessionsRouter);
app.use('/uploads', uploadsRouter);
app.use('/notifications', notificationsRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/categories', categoriesRouter);
app.use('/handouts', handoutsRouter);
app.use('/admin', adminRouter);
// این دوتا برخلاف بقیه (behind requireAuth تو خیلی از sub-route هاشون) از
// اول باید بخشِ GET عمومیِ بدون توکن داشته باشن - صفحه‌ی فرود و بلاگ باید
// بدون لاگین قابل‌دیدن باشن؛ requireAuth+requireRole فقط رو زیرمسیر
// /admin/... همین دو router اعمال می‌شه (خودِ فایل‌هاشون)
app.use('/blog', blogRouter);
app.use('/cms', cmsRouter);
// مسیرِ مستقل از examId - تاریخچه‌ی خودِ دانشجو رو مستقیم رو studentId
// می‌گیره (routes/myAttempts.ts)، نه از زیرِ یه آزمونِ خاص
app.use('/attempts', myAttemptsRouter);
app.use('/exams/:examId/attempts', examAttemptsRouter);
// این روت (routes/questions.ts) از قبل کامل نوشته شده بود - سوالاتِ
// خودِ آزمون (ExamQuestion) + ایمپورت از بانک سوال (from-bank) - ولی
// اینجا هیچ‌وقت mount نشده بود، برای همین GET/POST به
// /exams/:examId/questions همیشه 404 می‌داد (دقیقاً همون خطای
// «دریافت سوال‌ها با خطا مواجه شد» که تو صفحه‌ی سوالاتِ یه آزمون می‌دیدی)
app.use('/exams/:examId/questions', examQuestionsRouter);
app.use('/banks', questionBanksRouter);
app.use('/exams', examsRouter);

// این دوتا باید آخرِ همه‌ی route ها بیان: notFoundHandler برای مسیری که هیچ
// router‌ای match نکرده، errorHandler (چهار پارامتری) برای هر throw/next(err)
// که تو کل زنجیره بالا اتفاق بیفته - از جمله چیزهایی که asyncHandler می‌گیره
app.use(notFoundHandler);
app.use(errorHandler);

initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`server running on port ${env.PORT}`);
  startAttemptSweeper();
  startPaymentReconciler();
});