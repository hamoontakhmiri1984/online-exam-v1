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
    });
    res.json(attempts.map(serializeAttempt));
  }),
);


router.get(
  '/events',
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

    const events = await prisma.examAttemptEvent.findMany({
      where: { attempt: { is: { examId: exam.id } } },
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
        attempt: {
          select: {
            id: true,
            student: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });
    res.json(
      events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        occurredAt: event.occurredAt.toISOString(),
        attemptId: event.attempt.id,
        student: event.attempt.student,
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
