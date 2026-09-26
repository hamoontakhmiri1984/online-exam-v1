import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { loadAccessibleExam } from '../../lib/examAccess';
import { lockExamForShare } from '../../lib/examLock';
import { getExamWindowEndMs } from '../../lib/examTiming';
import {
  FINISH_GRACE_MS,
  finalizeAttempt,
  finalizeExpiredAttempts,
  notifyInstructorsAboutFinish,
  sanitizeAnswers,
} from '../../lib/attemptFinalize';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import {
  finishAttemptSchema,
  autosaveAnswersSchema,
} from '../../validation/attemptSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest, conflict } from '../../lib/errors';

import { serializeAttempt } from './examAttempts.service';

const router = Router({ mergeParams: true });
router.use(requireAuth);

// POST /exams/:examId/attempts/start
router.post(
  '/start',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student'
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    // دفاع در عمق: علاوه بر این‌که GET /questions قبل از scheduledAt چیزی
    // برنمی‌گردونه (و IntroScreen سمت کلاینت اصلاً رندر نمی‌شه)، این چک هم
    // مستقل لازمه - وگرنه یه کاربر که مستقیم به /start درخواست بزنه
    // (بدون رد شدن از UI) می‌تونه یه attempt زودهنگام بسازه و expiresAt
    // رو زودتر از موعد واقعی قفل کنه
    if (Date.now() < exam.scheduledAt.getTime()) {
      throw forbidden('این آزمون هنوز شروع نشده');
    }

    const existing = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: sub } },
    });

    if (existing) {
      if (existing.finishedAt) {
        throw conflict('قبلاً تو این آزمون شرکت کردی');
      }
      // رهاشده: وقتش (+ مهلت) تموم شده ولی finish نشده - همین‌جا با
      // جواب‌های autosave‌شده بسته می‌شه، نه اینکه دوباره resume بشه
      if (Date.now() > existing.expiresAt.getTime() + FINISH_GRACE_MS) {
        await finalizeExpiredAttempts({ examId: exam.id, studentId: sub });
        throw conflict('قبلاً تو این آزمون شرکت کردی');
      }
      // idempotent resume: قبلاً start شده و هنوز finish نشده (مثلاً رفرش
      // صفحه وسط آزمون) - همون startedAt/expiresAt قبلی رو برمی‌گردونیم
      return res.json({
        startedAt: existing.startedAt.toISOString(),
        expiresAt: existing.expiresAt.toISOString(),
        serverNow: new Date().toISOString(),
      });
    }

    try {
      // ساخت attempt و چک‌های وابسته به «وضعیتِ فعلیِ آزمون» همه داخل یه
      // تراکنش با قفل مشترکِ ردیف آزمون انجام می‌شن (lib/examLock.ts): همون
      // قفلی که ویرایش/حذف/افزودنِ سوال، تغییر زمان/مدت/گروه و لغو انتشار
      // می‌گیرن. پس یا اون تغییر کامل قبل از start commit شده و اینجا دیده
      // می‌شه، یا start اول commit می‌شه و اون تغییر رد می‌شه
      const attempt = await prisma.$transaction(async (tx) => {
        const locked = await lockExamForShare(tx, exam.id);

        // مقدارهای بالا (exam) قبل از قفل خونده شدن و ممکنه کهنه باشن
        if (locked.status !== 'Published') throw forbidden();
        if (Date.now() < locked.scheduledAt.getTime()) {
          throw forbidden('این آزمون هنوز شروع نشده');
        }

        // آزمونِ بدون سوال (مثلاً بعد از انتشار، همه‌ی سوال‌هاش پاک شده) نباید
        // شروع بشه: attempt ساخته‌شده تنها فرصتِ دانشجو رو با نمره‌ی ۰ از ۰
        // می‌سوزونه و آزمون رو هم برای همیشه قفل می‌کنه
        // (assertExamQuestionsEditable). این چک بعد از شاخه‌ی resume هست،
        // چون attempt موجود یعنی سوال‌ها قفل بودن و تعدادشون صفر نمی‌شه
        const questionCount = await tx.examQuestion.count({
          where: { examId: exam.id },
        });
        if (questionCount === 0) {
          throw forbidden('این آزمون هنوز سوالی نداره');
        }

        // بازه‌ی آزمون: از scheduledAt تا scheduledAt + durationMinutes. بعد از
        // این بازه نمی‌شه attempt جدید ساخت (ادامه‌ی attempt قبلاً‌شروع‌شده
        // بالاتر بدون این چک برمی‌گرده)
        const windowEnd = getExamWindowEndMs(locked);
        if (Date.now() >= windowEnd) {
          throw forbidden('زمان این آزمون تموم شده');
        }

        const now = new Date();
        // سقفِ واقعیِ زمان: تا پایانِ بازه‌ی آزمون (windowEnd)، نه لزوماً کل
        // durationMinutes. وگرنه دانشجویی که دیر (مثلاً یه دقیقه مونده به
        // پایانِ بازه) start بزنه، بازم کل مدت‌زمانِ آزمون رو از همون لحظه
        // می‌گرفت و عملاً بیشتر از بقیه وقت داشت - چیزی که نباید ممکن باشه.
        const fullDurationEnd =
          now.getTime() + locked.durationMinutes * 60_000;
        const expiresAt = new Date(Math.min(fullDurationEnd, windowEnd));

        return tx.examAttempt.create({
          data: {
            examId: exam.id,
            studentId: sub,
            answers: {},
            correctCount: 0,
            totalQuestions: 0,
            startedAt: now,
            expiresAt,
            finishedAt: null,
          },
        });
      });

      res.status(201).json({
        startedAt: attempt.startedAt.toISOString(),
        expiresAt: attempt.expiresAt.toISOString(),
        // ساعت سرور: کلاینت با این، ساعتِ خودش رو با سرور هم‌تراز می‌کنه
        // (client/src/hooks/useExamRunner/examClock.ts) تا تایمر روی ساعتِ
        // غلطِ دستگاه دانشجو حساب نشه
        serverNow: new Date().toISOString(),
      });
    } catch (err) {
      // race: دو request هم‌زمان start بزنن؛ unique index (examId, studentId)
      // جلوی رکورد دوم رو می‌گیره (P2002) - رکورد برنده‌ی race رو برگردون.
      // فقط برای همین خطا: خطاهای دیگه (forbidden و ...) باید همون‌طور بالا برن
      const isUniqueViolation =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002';
      if (isUniqueViolation) {
        const winner = await prisma.examAttempt.findUnique({
          where: { examId_studentId: { examId: exam.id, studentId: sub } },
        });
        if (winner) {
          return res.json({
            startedAt: winner.startedAt.toISOString(),
            expiresAt: winner.expiresAt.toISOString(),
            serverNow: new Date().toISOString(),
          });
        }
      }
      throw err;
    }
  })
);

// POST /exams/:examId/attempts/finish
router.post(
  '/finish',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student'
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = finishAttemptSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const existing = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: sub } },
    });
    if (!existing) throw notFound('هنوز این آزمون رو شروع نکردی');
    if (existing.finishedAt) {
      // قبلاً finish شده - نتیجه‌ی همونو برگردون (idempotent) نه خطا، چون
      // ممکنه این request بر اثر retry شبکه دوباره فرستاده شده باشه
      return res.json(serializeAttempt(existing));
    }

    const now = new Date();
    const endedByTimeout = now.getTime() >= existing.expiresAt.getTime();
    const finishedAt = endedByTimeout ? existing.expiresAt : now;

    // ارسال خیلی دیرتر از پایان زمان: جواب‌های ارسالی کلاینت قبول نمی‌شن؛
    // فقط جواب‌هایی که قبلاً (تا مهلت) autosave شدن حساب می‌شن - دقیقاً همون
    // چیزی که sweep رهاشده‌ها هم حساب می‌کنه
    const tooLate =
      now.getTime() > existing.expiresAt.getTime() + FINISH_GRACE_MS;
    const answers = tooLate
      ? sanitizeAnswers(existing.answers)
      : parsed.data.answers;

    // اتمیک: اگه هم‌زمان request/sweep دیگه‌ای زودتر finalize کرده باشه،
    // won=false می‌شه و نتیجه‌ی ثبت‌شده برمی‌گرده (بدون اعلان دوبل)
    const { won, attempt } = await finalizeAttempt({
      attemptId: existing.id,
      examId: exam.id,
      answers,
      finishedAt,
      endedByTimeout,
    });

    if (won) {
      await notifyInstructorsAboutFinish(attempt).catch((err) =>
        console.error('notifyInstructorsAboutFinish failed:', err)
      );
    }

    res.json(serializeAttempt(attempt));
  })
);

// PATCH /exams/:examId/attempts/answers
router.patch(
  '/answers',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student'
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = autosaveAnswersSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const existing = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: sub } },
    });
    if (!existing) throw notFound('هنوز این آزمون رو شروع نکردی');
    // بعد از finish، جواب‌های نهایی رو خود finish (idempotent) نگه می‌داره؛
    // autosave بعد از اون معنی نداره
    if (existing.finishedAt) throw conflict('این آزمون قبلاً ثبت شده');
    // بعد از پایان زمان (+ مهلت) autosave پذیرفته نمی‌شه
    if (Date.now() > existing.expiresAt.getTime() + FINISH_GRACE_MS) {
      throw conflict('زمان این آزمون تموم شده');
    }

    // اتمیک و «فقط رو به جلو»: ذخیره فقط وقتی انجام می‌شه که
    //  - attempt هنوز finish نشده باشه (بازنویسی بعد از finish هم‌زمان ممنوع)
    //  - revision این درخواست از revision ذخیره‌شده بزرگ‌تر باشه. اگه یه
    //    درخواستِ قدیمی‌تر دیرتر از درخواست جدیدتر برسه، رد می‌شه و جواب
    //    جدیدتر رو بازنویسی نمی‌کنه
    const { answers, revision } = parsed.data;
    const { count } = await prisma.examAttempt.updateMany({
      where: {
        id: existing.id,
        finishedAt: null,
        answersRevision: { lt: revision },
      },
      data: { answers, answersRevision: revision },
    });

    if (count === 0) {
      const current = await prisma.examAttempt.findUnique({
        where: { id: existing.id },
        select: { finishedAt: true, answersRevision: true },
      });
      if (!current || current.finishedAt) {
        throw conflict('این آزمون قبلاً ثبت شده');
      }
      // نسخه‌ی قدیمی/تکراری: خطا نیست - یه ذخیره‌ی جدیدتر قبلاً نشسته. کلاینت
      // با revision برگشتی شمارنده‌ش رو جلو می‌بره و اگه لازم بود دوباره می‌فرسته
      return res.json({ saved: false, revision: current.answersRevision });
    }

    res.json({ saved: true, revision });
  })
);

export default router;