// server/src/routes/questions/examQuestionsRead.routes.ts
import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../lib/asyncHandler';
import { prisma } from '../../lib/prisma';
import { isAnswerKeyReleased } from '../../lib/examTiming';

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

    return res.json(questions.map(serializeExamQuestion));
  })
);

// فقط تعداد سوال‌ها (بدون متن/گزینه) - برای صفحه‌ی شروع آزمون قبل از start.
// مثل GET / برای دانشجو قبل از scheduledAt صفر برمی‌گردونه
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
  })
);

export default router;