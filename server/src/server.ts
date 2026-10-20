import { listen, createShutdown, httpDrainer } from './lib/serverLifecycle';
import { logEvent } from './lib/logger';
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

if (env.TRUST_PROXY > 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({ service: 'online-exam-api', health: '/health' });
});

app.get(
  '/health',
  asyncHandler(async (_req, res) => {
    // Bound each dependency probe and report failures as 503.
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

// Private uploads are served through authorized signed URLs, never a static directory.

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
// Public content routes apply authentication only to their admin endpoints.
app.use('/blog', blogRouter);
app.use('/cms', cmsRouter);
app.use('/attempts', myAttemptsRouter);
app.use('/exams/:examId/attempts', examAttemptsRouter);
app.use('/exams/:examId/questions', examQuestionsRouter);
app.use('/banks', questionBanksRouter);
app.use('/exams', examsRouter);
app.use('/practice', practiceRouter);

// Mount not-found and error handlers after every route.
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
