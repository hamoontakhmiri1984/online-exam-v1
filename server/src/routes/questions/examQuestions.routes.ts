// server/src/routes/questions/examQuestions.routes.ts
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth';

import { asyncHandler } from '../../lib/asyncHandler';
import { prisma } from '../../lib/prisma';

import { badRequest, forbidden, notFound } from '../../lib/errors';

import { loadAccessibleExam } from '../../lib/examAccess';
import { prepareQuotaGuard } from '../../lib/quota';
import { isAnswerKeyReleased } from '../../lib/examTiming';

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
  getExamQuestions,
  updateExamQuestion,
  type ExamQuestionRecord,
} from './examQuestions.service';
const router = Router({
  mergeParams: true,
});

router.use(requireAuth);

function serializeQuestion(question: ExamQuestionRecord) {
  return {
    id: question.id,
    examId: question.examId,
    questionId: question.questionId,
    text: question.textSnapshot,
    options: question.optionsSnapshot,
    correctOptionIndex: question.correctIndexSnapshot,
  };
}

router.get(
  '/',
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

    if (role === 'Student' && Date.now() < exam.scheduledAt.getTime()) {
      return res.json([]);
    }

    // دانشجو فقط بعد از start (یعنی attempt با تایمر سمت سرور وجود داره)
    // سوال‌ها رو می‌گیره - وگرنه بعد از scheduledAt می‌تونست بدون شروع
    // آزمون و بدون تایمر سوال‌ها رو بخونه. تعداد سوال‌ها برای صفحه‌ی شروع
    // از GET /count میاد
    let canSeeAnswerKey = false;
    if (role === 'Student') {
      const attempt = await prisma.examAttempt.findUnique({
        where: {
          examId_studentId: { examId: exam.id, studentId: sub },
        },
        select: { id: true, finishedAt: true },
      });
      if (!attempt) {
        return res.json([]);
      }
      // جواب صحیح فقط وقتی به دانشجو برمی‌گرده که:
      //   ۱) attempt خودش تموم شده باشه (وگرنه وسط آزمون جواب‌ها رو می‌دید)
      //   ۲) آزمون اجازه‌ی مرور داشته باشه (allowReview)
      //   ۳) پایان *عمومی* آزمون (+ مهلت ارسال) گذشته باشه - وگرنه دانشجویی که
      //      زودتر ثبت نهایی کرده پاسخنامه رو برمی‌داشت و برای بقیه‌ی
      //      دانشجوهایی که هنوز وسط آزمون‌ان می‌فرستاد
      canSeeAnswerKey =
        attempt.finishedAt !== null && isAnswerKeyReleased(exam);
    }

    const questions = await getExamQuestions(exam.id);

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
        }))
      );
    }

    return res.json(questions.map(serializeQuestion));
  })
);

// فقط تعداد سوال‌ها (بدون متن/گزینه) - برای صفحه‌ی شروع آزمون قبل از start.
// مثل GET / برای دانشجو قبل از scheduledAt صفر برمی‌گردونه
router.get(
  '/count',
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

    if (role === 'Student' && Date.now() < exam.scheduledAt.getTime()) {
      return res.json({ count: 0 });
    }

    const count = await prisma.examQuestion.count({
      where: { examId: exam.id },
    });

    return res.json({ count });
  })
);

router.post(
  '/',
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

    return res.status(201).json(serializeQuestion(question));
  })
);

router.post(
  '/bulk',
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

    return res.status(201).json(questions.map(serializeQuestion));
  })
);

router.put(
  '/:questionId',
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

    const parsed = updateQuestionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    const question = await updateExamQuestion(
      exam.id,
      req.params.questionId,
      parsed.data
    );

    return res.json(serializeQuestion(question));
  })
);

router.delete(
  '/:questionId',
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

    await deleteExamQuestion(exam.id, req.params.questionId);

    return res.status(204).end();
  })
);

export default router;
