import { randomUUID } from 'node:crypto';
import { logEvent } from '../../lib/logger';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  loadAccessibleExam,
  isStudentInExamGroups,
} from '../../lib/examAccess';
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
import { examAttemptLimiter } from '../../middleware/rateLimiters';
import {
  finishAttemptSchema,
  autosaveAnswersSchema,
  proctorEventSchema,
} from '../../validation/attemptSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest, conflict } from '../../lib/errors';

import { serializeAttempt } from './examAttempts.service';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.post(
  '/start',
  requireRole('Student'),
  examAttemptLimiter,
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student',
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

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
      // Finalize expired attempts from saved answers rather than resuming them.
      if (Date.now() > existing.expiresAt.getTime() + FINISH_GRACE_MS) {
        await finalizeExpiredAttempts({ examId: exam.id, studentId: sub });
        throw conflict('قبلاً تو این آزمون شرکت کردی');
      }
      // Re-entry preserves the original start and deadline.
      return res.json({
        startedAt: existing.startedAt.toISOString(),
        expiresAt: existing.expiresAt.toISOString(),
        serverNow: new Date().toISOString(),
      });
    }

    try {
      // Create attempts under the shared exam lock; edits use the exclusive lock.
      const attempt = await prisma.$transaction(async (tx) => {
        const locked = await lockExamForShare(tx, exam.id);

        // Read current values again after acquiring the exam lock.
        if (locked.status !== 'Published') throw forbidden();

        // Recheck group membership under the exam lock.
        const stillMember = await isStudentInExamGroups(tx, exam.id, sub);
        if (!stillMember) throw forbidden();
        if (Date.now() < locked.scheduledAt.getTime()) {
          throw forbidden('این آزمون هنوز شروع نشده');
        }

        const questionCount = await tx.examQuestion.count({
          where: { examId: exam.id },
        });
        if (questionCount === 0) {
          throw forbidden('این آزمون هنوز سوالی نداره');
        }

        const windowEnd = getExamWindowEndMs(locked);
        if (Date.now() >= windowEnd) {
          throw forbidden('زمان این آزمون تموم شده');
        }

        const now = new Date();
        // Late starters receive only the time remaining in the shared exam window.
        const fullDurationEnd = now.getTime() + locked.durationMinutes * 60_000;
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
            shuffleSeed: randomUUID(),
            finishedAt: null,
          },
        });
      });

      res.status(201).json({
        startedAt: attempt.startedAt.toISOString(),
        expiresAt: attempt.expiresAt.toISOString(),
        // Return server time so device clock skew does not alter the countdown.
        serverNow: new Date().toISOString(),
      });
    } catch (err) {
      // Concurrent starts return the attempt that won the unique constraint.
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
  }),
);

router.post(
  '/finish',
  requireRole('Student'),
  examAttemptLimiter,
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student',
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
      // Return the existing result when finish is retried.
      return res.json(serializeAttempt(existing));
    }

    const now = new Date();
    const endedByTimeout = now.getTime() >= existing.expiresAt.getTime();
    const finishedAt = endedByTimeout ? existing.expiresAt : now;

    // After the grace period, ignore incoming answers and grade the saved ones.
    const tooLate =
      now.getTime() > existing.expiresAt.getTime() + FINISH_GRACE_MS;
    const answers = tooLate
      ? sanitizeAnswers(existing.answers)
      : parsed.data.answers;

    // Only the winning finalizer may send the completion notification.
    const { won, attempt } = await finalizeAttempt({
      attemptId: existing.id,
      examId: exam.id,
      answers,
      finishedAt,
      endedByTimeout,
      shuffleSeed: existing.shuffleSeed,
    });

    if (won) {
      await notifyInstructorsAboutFinish(attempt).catch((err) =>
        logEvent('error', 'notifyInstructorsAboutFinish failed:', err),
      );
    }

    res.json(serializeAttempt(attempt));
  }),
);

router.patch(
  '/answers',
  requireRole('Student'),
  examAttemptLimiter,
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student',
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = autosaveAnswersSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const existing = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: sub } },
    });
    if (!existing) throw notFound('هنوز این آزمون رو شروع نکردی');
    if (existing.finishedAt) throw conflict('این آزمون قبلاً ثبت شده');
    if (Date.now() > existing.expiresAt.getTime() + FINISH_GRACE_MS) {
      throw conflict('زمان این آزمون تموم شده');
    }

    // Persist only newer revisions on unfinished attempts within the deadline.
    const { answers, revision } = parsed.data;
    const count = await prisma.$executeRaw`
      UPDATE "exam_attempts"
      SET "answers" = ${JSON.stringify(answers)}::jsonb,
          "answersRevision" = ${revision}
      WHERE "id" = ${existing.id}
        AND "finishedAt" IS NULL
        AND "answersRevision" < ${revision}
        AND "expiresAt" + (${FINISH_GRACE_MS}::double precision * interval '1 millisecond')
            >= (clock_timestamp() AT TIME ZONE 'UTC')
    `;

    if (count === 0) {
      const current = await prisma.examAttempt.findUnique({
        where: { id: existing.id },
        select: { finishedAt: true, expiresAt: true, answersRevision: true },
      });
      if (!current || current.finishedAt) {
        throw conflict('این آزمون قبلاً ثبت شده');
      }
      if (Date.now() > current.expiresAt.getTime() + FINISH_GRACE_MS) {
        throw conflict('زمان این آزمون تموم شده');
      }
      // Return the stored revision so clients can recover from stale writes.
      return res.json({ saved: false, revision: current.answersRevision });
    }

    res.json({ saved: true, revision });
  }),
);

router.post(
  '/events',
  requireRole('Student'),
  examAttemptLimiter,
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      'Student',
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = proctorEventSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const attempt = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: sub } },
      select: { id: true, finishedAt: true, expiresAt: true },
    });
    if (!attempt) throw notFound('هنوز این آزمون رو شروع نکردی');
    if (attempt.finishedAt) throw conflict('این آزمون قبلاً ثبت شده');
    if (Date.now() > attempt.expiresAt.getTime() + FINISH_GRACE_MS) {
      throw conflict('زمان این آزمون تموم شده');
    }

    await prisma.examAttemptEvent.create({
      data: { attemptId: attempt.id, eventType: parsed.data.type },
    });
    res.status(201).json({ logged: true });
  }),
);

export default router;
