import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../lib/asyncHandler';
import { prisma } from '../../lib/prisma';
import { isAnswerKeyReleased } from '../../lib/examTiming';
import { getOptionOrder, shuffleExamQuestions } from '../../lib/examShuffle';

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
    let shuffleSeed: string | null = null;
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
      shuffleSeed = attempt.shuffleSeed;
      // Release the answer key only after the shared exam window closes.
      canSeeAnswerKey =
        attempt.finishedAt !== null && isAnswerKeyReleased(exam);
    }

    const questions = await getExamQuestions(exam.id);

    if (role === 'Student') {
      const orderedQuestions = shuffleExamQuestions(questions, shuffleSeed);
      return res.json(
        orderedQuestions.map((question) => {
          const optionOrder = getOptionOrder(
            question.optionsSnapshot.length,
            shuffleSeed,
            question.id,
          );
          return {
            id: question.id,
            examId: question.examId,
            text: question.textSnapshot,
            options: optionOrder.map((index) => question.optionsSnapshot[index]),
            ...(canSeeAnswerKey
              ? {
                  correctOptionIndex: optionOrder.indexOf(
                    question.correctIndexSnapshot,
                  ),
                }
              : {}),
          };
        }),
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
