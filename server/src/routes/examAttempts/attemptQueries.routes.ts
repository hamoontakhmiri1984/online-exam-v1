import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { loadAccessibleExam } from '../../lib/examAccess';
import { finalizeExpiredAttempts } from '../../lib/attemptFinalize';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden } from '../../lib/errors';

import { serializeAttempt } from './examAttempts.service';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get(
  '/',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    // attempt‌های رهاشده‌ی این آزمون قبل از لیست شدن بسته می‌شن
    await finalizeExpiredAttempts({ examId: exam.id });

    const attempts = await prisma.examAttempt.findMany({
      where: { examId: exam.id, finishedAt: { not: null } },
    });
    res.json(attempts.map(serializeAttempt));
  })
);

router.get(
  '/me',
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

    await finalizeExpiredAttempts({ examId: exam.id, studentId: sub });

    const attempt = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: sub },
    });
    if (!attempt) throw notFound('هنوز تو این آزمون شرکت نکردی');

    // در حال انجام (هنوز finish نشده): answers همیشه برمی‌گرده - برای
    // resume بعد از رفرش لازمه. محدودیت allowReview فقط بعد از پایان
    // آزمون معنی داره، نه وسط انجامش
    if (attempt.finishedAt && !exam.allowReview) {
      return res.json({ ...serializeAttempt(attempt), answers: undefined });
    }
    res.json(serializeAttempt(attempt));
  })
);

export default router;