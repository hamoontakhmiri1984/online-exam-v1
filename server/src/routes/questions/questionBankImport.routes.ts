import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth';

import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest, forbidden, notFound } from '../../lib/errors';

import { loadAccessibleExam } from '../../lib/examAccess';

import { addBankQuestionsToExamSchema } from '../../validation/questionSchemas';

import { assertExamQuestionsEditable } from './examQuestions.service';
import { importBankQuestionsToExam } from './questionBankImport.service';

type ImportedExamQuestion = {
  id: string;
  examId: string;
  questionId: string | null;
  order: number;
  textSnapshot: string;
  optionsSnapshot: string[];
  correctIndexSnapshot: number;
};

const router = Router({
  mergeParams: true,
});

router.use(requireAuth);

function serializeQuestion(question: ImportedExamQuestion) {
  return {
    id: question.id,
    examId: question.examId,
    questionId: question.questionId,
    text: question.textSnapshot,
    options: question.optionsSnapshot,
    correctOptionIndex: question.correctIndexSnapshot,
  };
}

router.post(
  '/from-bank',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { sub, role } = req.user!;

    const { exam, allowed } = await loadAccessibleExam(
      req.params.examId,
      sub,
      role
    );

    if (!exam) {
      throw notFound('آزمون یافت نشد');
    }

    if (!allowed) {
      throw forbidden();
    }

    assertExamQuestionsEditable(exam);

    const parsed = addBankQuestionsToExamSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    // عمداً چک سهمیه‌ی پلن اینجا نیست: سوالِ ایمپورت‌شده از بانک تو
    // getInstructorUsage جدا شمرده نمی‌شه (همون سوالِ بانکه)، پس مصرفِ
    // جدیدی نداره. سهمیه موقع ساخت سوال تو بانک چک می‌شه

    const questions = (await importBankQuestionsToExam(
      exam.id,
      parsed.data.questionIds,
      role === 'Instructor' ? sub : undefined
    )) as ImportedExamQuestion[];

    return res.status(201).json(questions.map(serializeQuestion));
  })
);

export default router;
