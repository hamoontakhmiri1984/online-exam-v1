// server/src/routes/questions/examQuestionsManage.routes.ts
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest } from '../../lib/errors';
import { prepareQuotaGuard } from '../../lib/quota';

import {
  createQuestionSchema,
  updateQuestionSchema,
  bulkQuestionsSchema,
} from '../../validation/questionSchemas';

import {
  assertExamQuestionsEditable,
  createExamQuestion,
  createExamQuestionsBulk,
  deleteExamQuestion,
  loadExamOrThrow,
  serializeExamQuestion,
  updateExamQuestion,
} from './examQuestions.service';

const router = Router({
  mergeParams: true,
});

router.use(requireAuth);
router.use(requireRole('Instructor', 'SuperAdmin'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const exam = await loadExamOrThrow(req.params.examId, sub, role);
    assertExamQuestionsEditable(exam);

    const parsed = createQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    // چک سهمیه داخل همون تراکنشِ ساخت (پشت قفل مدرس) انجام می‌شه، نه جدا
    // قبلش - وگرنه درخواست‌های موازی همه از سقف رد می‌شدن (lib/quota.ts)
    const quotaGuard =
      role === 'Instructor'
        ? await prepareQuotaGuard(sub, 'questions')
        : undefined;

    const question = await createExamQuestion(
      exam.id,
      parsed.data,
      quotaGuard
    );

    return res.status(201).json(serializeExamQuestion(question));
  })
);

router.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const exam = await loadExamOrThrow(req.params.examId, sub, role);
    assertExamQuestionsEditable(exam);

    const parsed = bulkQuestionsSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    const quotaGuard =
      role === 'Instructor'
        ? await prepareQuotaGuard(sub, 'questions', parsed.data.length)
        : undefined;

    const questions = await createExamQuestionsBulk(
      exam.id,
      parsed.data,
      quotaGuard
    );

    return res.status(201).json(questions.map(serializeExamQuestion));
  })
);

router.put(
  '/:questionId',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const exam = await loadExamOrThrow(req.params.examId, sub, role);
    assertExamQuestionsEditable(exam);

    const parsed = updateQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    const question = await updateExamQuestion(
      exam.id,
      req.params.questionId,
      parsed.data
    );

    return res.json(serializeExamQuestion(question));
  })
);

router.delete(
  '/:questionId',
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const exam = await loadExamOrThrow(req.params.examId, sub, role);
    assertExamQuestionsEditable(exam);

    await deleteExamQuestion(exam.id, req.params.questionId);

    return res.status(204).end();
  })
);

export default router;