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
      role,
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    await finalizeExpiredAttempts({ examId: exam.id });

    const attempts = await prisma.examAttempt.findMany({
      where: { examId: exam.id, finishedAt: { not: null } },
      include: {
        events: {
          where: { type: 'TAB_HIDDEN' },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    res.json(
      attempts.map((attempt) => ({
        ...serializeAttempt(attempt),
        tabSwitchCount: attempt.events.length,
        tabSwitches: attempt.events.map((event) => event.createdAt.toISOString()),
      })),
    );
  }),
);

router.get(
  '/me',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student',
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    await finalizeExpiredAttempts({ examId: exam.id, studentId: sub });

    const attempt = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: sub },
    });
    if (!attempt) throw notFound('هنوز تو این آزمون شرکت نکردی');

    // Unfinished attempts always return saved answers for re-entry, regardless of allowReview.
    if (attempt.finishedAt && !exam.allowReview) {
      return res.json({ ...serializeAttempt(attempt), answers: undefined });
    }
    res.json(serializeAttempt(attempt));
  }),
);

export default router;
