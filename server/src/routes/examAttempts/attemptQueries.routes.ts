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
  '/audit',
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

    const parsedPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const parsedPageSize = Number.parseInt(String(req.query.pageSize ?? '25'), 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const pageSize =
      Number.isFinite(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 100)
        : 25;
    const where = { examId: exam.id };

    const [total, attempts] = await Promise.all([
      prisma.examAttempt.count({ where }),
      prisma.examAttempt.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        include: {
          student: { select: { id: true, name: true, username: true } },
          events: {
            where: { type: { in: ['TAB_HIDDEN', 'FULLSCREEN_EXIT', 'WINDOW_BLUR'] } },
            select: { type: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    res.json({
      items: attempts.map((attempt) => ({
        ...serializeAttempt(attempt),
        student: attempt.student,
        tabSwitchCount: attempt.events.filter(
          (event) => event.type === 'TAB_HIDDEN',
        ).length,
        tabSwitches: attempt.events
          .filter((event) => event.type === 'TAB_HIDDEN')
          .map((event) => event.createdAt.toISOString()),
        fullscreenExitCount: attempt.events.filter(
          (event) => event.type === 'FULLSCREEN_EXIT',
        ).length,
        fullscreenExits: attempt.events
          .filter((event) => event.type === 'FULLSCREEN_EXIT')
          .map((event) => event.createdAt.toISOString()),
        windowBlurCount: attempt.events.filter(
          (event) => event.type === 'WINDOW_BLUR',
        ).length,
        windowBlurs: attempt.events
          .filter((event) => event.type === 'WINDOW_BLUR')
          .map((event) => event.createdAt.toISOString()),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }),
);

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
          where: { type: { in: ['TAB_HIDDEN', 'FULLSCREEN_EXIT'] } },
          select: { type: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    res.json(
      attempts.map((attempt) => ({
        ...serializeAttempt(attempt),
        tabSwitchCount: attempt.events.filter(
          (event) => event.type === 'TAB_HIDDEN',
        ).length,
        tabSwitches: attempt.events
          .filter((event) => event.type === 'TAB_HIDDEN')
          .map((event) => event.createdAt.toISOString()),
        fullscreenExitCount: attempt.events.filter(
          (event) => event.type === 'FULLSCREEN_EXIT',
        ).length,
        fullscreenExits: attempt.events
          .filter((event) => event.type === 'FULLSCREEN_EXIT')
          .map((event) => event.createdAt.toISOString()),
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
