import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { loadAccessibleExam, examInclude } from '../../lib/examAccess';
import {
  createExamSchema,
  updateExamSchema,
} from '../../validation/examSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../../lib/errors';
import { withQuotaForRole } from '../../lib/quota';
import { withExamWriteLock } from '../../lib/examLock';

import {
  serializeExam,
  assertOwnsAllGroups,
  assertNotInPast,
  updateExam,
} from './exams.service';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const where =
      role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
        ? { instructorId: sub }
        : {
            status: 'Published' as const,
            groups: { some: { approvalStatus: 'Approved' as const, students: { some: { id: sub } } } },
          };

    const exams = await prisma.exam.findMany({
      where,
      include: { ...examInclude, ...(role === 'SuperAdmin' ? { instructor: { select: { id: true, name: true, username: true } } } : {}) },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(exams.map(exam => ({
      ...serializeExam(exam),
      ...(role === 'SuperAdmin' ? { instructor: exam.instructor } : {}),
    })));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    res.json(serializeExam(exam));
  })
);

router.post(
  '/',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    assertNotInPast(new Date(parsed.data.scheduledAt));

    await assertOwnsAllGroups(parsed.data.groupIds, role, sub);

    const exam = await withQuotaForRole(role, sub, 'activeExams', 1, (db) =>
      db.exam.create({
        data: {
          instructorId: sub,
          title: parsed.data.title,
          category: parsed.data.category,
          scheduledAt: new Date(parsed.data.scheduledAt),
          durationMinutes: parsed.data.durationMinutes,
          allowReview: parsed.data.allowReview,
          groups: { connect: parsed.data.groupIds.map((id) => ({ id })) },
        },
        include: examInclude,
      })
    );

    res.status(201).json(serializeExam(exam));
  })
);

router.put(
  '/:id',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const { exam: existing, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!existing) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = updateExamSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const exam = await updateExam(
      req.params.id,
      role,
      sub,
      existing,
      parsed.data
    );

    res.json(serializeExam(exam));
  })
);

router.post(
  '/:id/publish',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    if (exam.status === 'Published') {
      return res.json(serializeExam(exam));
    }

    const questionCount = await prisma.examQuestion.count({
      where: { examId: exam.id },
    });
    if (questionCount === 0) {
      throw badRequest('قبل از انتشار، آزمون باید حداقل یه سوال داشته باشه');
    }

    const updated = await prisma.exam.update({
      where: { id: exam.id },
      data: { status: 'Published' },
      include: examInclude,
    });
    res.json(serializeExam(updated));
  })
);

router.post(
  '/:id/unpublish',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    if (exam.status === 'Draft') {
      return res.json(serializeExam(exam));
    }

    if (exam._count.attempts > 0) {
      throw badRequest(
        'این آزمون قبلاً حداقل توسطِ یه دانشجو شروع شده - نمی‌شه لغوِ انتشارش کرد'
      );
    }

    // Check attempts under the same exam lock used by start.
    const updated = await withExamWriteLock(
      exam.id,
      async (tx, { attemptCount }) => {
        if (attemptCount > 0) {
          throw badRequest(
            'این آزمون قبلاً حداقل توسطِ یه دانشجو شروع شده - نمی‌شه لغوِ انتشارش کرد'
          );
        }

        return tx.exam.update({
          where: { id: exam.id },
          data: { status: 'Draft' },
          include: examInclude,
        });
      }
    );
    res.json(serializeExam(updated));
  })
);

router.delete(
  '/:id',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    await prisma.exam.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
