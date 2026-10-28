import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../lib/asyncHandler';
import { prisma } from '../../lib/prisma';
import { isAnswerKeyReleased } from '../../lib/examTiming';
import { shuffleExamQuestions } from '../../lib/examShuffle';

import {
  getExamQuestions,
  loadExamOrThrow,
  serializeExamQuestion,
} from './examQuestions.service';

const router = Router({
  mergeParams: true,
});

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const exam = await loadExamOrThrow(req.params.examId, sub, role);

    if (role === 'Student' && Date.now() < exam.scheduledAt.getTime()) {
      return res.json([]);
    }

    // Release question content only after an attempt has started.
    let canSeeAnswerKey = false;
    let activeShuffleSeed: string | null = null;
    if (role === 'Student') {
      const attempt = await prisma.examAttempt.findUnique({
        where: {
          examId_studentId: { examId: exam.id, studentId: sub },
        },
        select: { id: true, finishedAt: true, shuffleSeed: true },
      });
      if (!attempt) {
        return res.json([]);
      }
      // Expose answers only after the attempt finishes and the shared exam window closes, with review enabled.
      canSeeAnswerKey =
        attempt.finishedAt !== null && isAnswerKeyReleased(exam);
      if (attempt.finishedAt === null) activeShuffleSeed = attempt.shuffleSeed;
    }

    const storedQuestions = await getExamQuestions(exam.id);
    const questions =
      role === 'Student' && activeShuffleSeed
        ? shuffleExamQuestions(storedQuestions, activeShuffleSeed).map(
            ({ question, options, correctOptionIndex }) => ({
              ...question,
              optionsSnapshot: options,
              correctIndexSnapshot: correctOptionIndex,
            }),
          )
        : storedQuestions;

    if (role === 'Student') {
      return res.json(
        questions.map((question) => ({
          id: question.id,
          examId: question.examId,
          text: question.textSnapshot,
          options: question.optionsSnapshot,
          ...(canSeeAnswerKey
            ? { correctOptionIndex: question.correctIndexSnapshot }
            : {}),
        })),
      );
    }

    return res.json(questions.map(serializeExamQuestion));
  }),
);

router.get(
  '/count',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const exam = await loadExamOrThrow(req.params.examId, sub, role);

    if (role === 'Student' && Date.now() < exam.scheduledAt.getTime()) {
      return res.json({ count: 0 });
    }

    const count = await prisma.examQuestion.count({
      where: { examId: exam.id },
    });

    return res.json({ count });
  }),
);

export default router;
