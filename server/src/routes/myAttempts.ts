import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { finalizeExpiredAttempts } from '../lib/attemptFinalize';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
router.use(requireAuth);

// Attempt history is independent of the student's current group membership.
router.get(
  '/me',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;

    // Finalize this student's expired attempts before listing history.
    await finalizeExpiredAttempts({ studentId: sub });

    const attempts = await prisma.examAttempt.findMany({
      where: { studentId: sub, finishedAt: { not: null } },
      include: {
        exam: { select: { id: true, title: true, allowReview: true } },
      },
      orderBy: { finishedAt: 'desc' },
    });

    // History omits answers; the dedicated review endpoint enforces answer release.
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
