import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { finalizeExpiredAttempts } from '../lib/attemptFinalize';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
router.use(requireAuth);

// GET /attempts/me
// تاریخچه‌ی کامل تلاش‌های تمام‌شده‌ی خودِ دانشجو - برخلاف مسیر قبلی که
// MyResultsPage استفاده می‌کرد (GET /exams برای گرفتن examId‌های در دسترسِ
// *فعلی*، بعد GET .../attempts/me جدا برای هرکدوم)، اینجا مستقیم رو
// examAttempt با studentId فیلتر می‌کنیم و اطلاعاتِ آزمونِ لازم (عنوان،
// allowReview) رو هم با include میاریم. نتیجه‌ی این endpoint وابسته به
// عضویتِ *الانِ* دانشجو تو گروه‌ها نیست: اگه از گروهی که صاحبِ یه آزمونه
// حذف بشه، اون examId دیگه تو GET /exams نمی‌اومد و نتیجه‌ی قبلاً
// تمام‌شده‌ش (که تو دیتابیس دست‌نخورده می‌مونه) از «نتایج من» محو می‌شد.
router.get(
  '/me',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;

    // رهاشده‌های این دانشجو (روی هر آزمونی) قبل از لیست شدن بسته می‌شن -
    // دقیقاً همون کاری که GET .../attempts/me تک‌آزمونی هم می‌کرد
    await finalizeExpiredAttempts({ studentId: sub });

    const attempts = await prisma.examAttempt.findMany({
      where: { studentId: sub, finishedAt: { not: null } },
      include: {
        exam: { select: { id: true, title: true, allowReview: true } },
      },
      orderBy: { finishedAt: 'desc' },
    });

    // answers عمداً برنمی‌گرده - این لیست فقط برای خلاصه/تاریخچه‌ست،
    // مرورِ واقعیِ پاسخ‌ها همچنان از GET /exams/:examId/attempts/me میاد
    // (که allowReview رو هم چک می‌کنه)
    res.json(
      attempts.map((a) => ({
        id: a.id,
        examId: a.examId,
        studentId: a.studentId,
        correctCount: a.correctCount,
        totalQuestions: a.totalQuestions,
        startedAt: a.startedAt.toISOString(),
        finishedAt: a.finishedAt!.toISOString(),
        expiresAt: a.expiresAt.toISOString(),
        endedByTimeout: a.endedByTimeout,
        exam: {
          id: a.exam.id,
          title: a.exam.title,
          allowReview: a.exam.allowReview,
        },
      }))
    );
  })
);

export default router;