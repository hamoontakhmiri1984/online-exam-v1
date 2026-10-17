import { listen, createShutdown, httpDrainer } from './lib/serverLifecycle';
import { logEvent } from './lib/logger';
// server/src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { rateLimitRedis } from './lib/rateLimitRedis';
import { waitForRedis, redisHealth } from './lib/redisConnection';
import { initSocket, stopSocketSweep } from './realtime/socket';
import { startAttemptSweeper } from './lib/attemptFinalize';
import { startPaymentReconciler } from './lib/payments';
import authRouter from './routes/auth';
import groupsRouter from './routes/groups';
import studentsRouter from './routes/students';
import lessonSessionsRouter from './routes/lessonSessions';
import uploadsRouter from './routes/uploads';
import examsRouter from './routes/exams';
import practiceRouter from './routes/practice';
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
import { asyncHandler } from './lib/asyncHandler';

const HEALTH_TIMEOUT_MS = 3000;

const app = express();
const httpServer = createServer(app);
const drainHttp = httpDrainer(httpServer);
let stopping = false;
let socket: ReturnType<typeof initSocket> | undefined;
const stopWorkers: Array<() => Promise<void>> = [];
app.use((_req, res, next) => {
  if (stopping) { res.status(503).json({ error: 'سرویس در حال راه‌اندازی مجدد است.' }); return; }
  next();
});

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

// API entry point; dependency readiness is reported separately by /health.
app.get('/', (_req, res) => {
  res.json({ service: 'online-exam-api', health: '/health' });
});

app.get(
  '/health',
  asyncHandler(async (_req, res) => {
    // هر وابستگی جدا چک می‌شه و با تایم‌اوت: Redis/DB که قطع باشه نباید request
    // رو معلق کنه. اتصال اصلی و اتصال محدودکننده جدا بررسی می‌شوند. خطا
    // هم به errorHandler نمی‌ره - health check باید ۵۰۳ + وضعیتِ هر وابستگی بده
    const check = (name: string, run: () => Promise<unknown>) => {
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${name} timeout`)),
          HEALTH_TIMEOUT_MS
        );
      });
      return Promise.race([run(), timeout])
        .then(
          () => 'ok' as const,
          () => 'down' as const
        )
        .finally(() => clearTimeout(timer));
    };

    const [db, cache, limiter] = await Promise.all([
      check('db', () => prisma.$queryRaw`SELECT 1`),
      check('redis', () => redisHealth(redis)),
      check('rateLimitRedis', () => redisHealth(rateLimitRedis)),
    ]);

    if (db === 'ok' && cache === 'ok' && limiter === 'ok') {
      return res.json({ status: 'ok' });
    }
    res.status(503).json({ status: 'error', db, redis: cache, rateLimitRedis: limiter });
  })
);

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
app.use('/practice', practiceRouter);

// این دوتا باید آخرِ همه‌ی route ها بیان: notFoundHandler برای مسیری که هیچ
// router‌ای match نکرده، errorHandler (چهار پارامتری) برای هر throw/next(err)
// که تو کل زنجیره بالا اتفاق بیفته - از جمله چیزهایی که asyncHandler می‌گیره
app.use(notFoundHandler);
app.use(errorHandler);

const shutdown = createShutdown(async () => {
  stopping = true;
  // Close listeners before dependencies, allowing accepted requests to finish.
  const drained = drainHttp();
  // Socket.IO also closes its Engine.IO transports and its HTTP server.
  const socketsClosed = new Promise<void>(resolve => {
    if (socket) socket.close(() => resolve()); else resolve();
  });
  const results = await Promise.allSettled([drained, socketsClosed, stopSocketSweep(), ...stopWorkers.map(stop => stop())]);
  if (redis.isOpen) redis.destroy();
  if (rateLimitRedis.isOpen) rateLimitRedis.destroy();
  await prisma.$disconnect();
  const failed = results.find(result => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
});
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });

async function start() {
  await Promise.all([waitForRedis(redis), waitForRedis(rateLimitRedis)]);
  if (stopping) return;
  socket = initSocket(httpServer);
  await listen(httpServer, Number(env.PORT));
  if (stopping) return;
  stopWorkers.push(startAttemptSweeper(), startPaymentReconciler());
  logEvent('info', `server_listening:${env.PORT}`);
}
void start().catch(error => {
  logEvent('error', 'server_start_failed', error);
  void shutdown('startup_failure', 1);
});