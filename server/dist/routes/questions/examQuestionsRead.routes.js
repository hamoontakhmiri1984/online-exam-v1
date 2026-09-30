"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/questions/examQuestionsRead.routes.ts
const express_1 = require("express");
const requireAuth_1 = require("../../middleware/requireAuth");
const asyncHandler_1 = require("../../lib/asyncHandler");
const prisma_1 = require("../../lib/prisma");
const examTiming_1 = require("../../lib/examTiming");
const examQuestions_service_1 = require("./examQuestions.service");
const router = (0, express_1.Router)({
    mergeParams: true,
});
router.use(requireAuth_1.requireAuth);
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const exam = await (0, examQuestions_service_1.loadExamOrThrow)(req.params.examId, sub, role);
    if (role === 'Student' && Date.now() < exam.scheduledAt.getTime()) {
        return res.json([]);
    }
    // دانشجو فقط بعد از start (یعنی attempt با تایمر سمت سرور وجود داره)
    // سوال‌ها رو می‌گیره - وگرنه بعد از scheduledAt می‌تونست بدون شروع
    // آزمون و بدون تایمر سوال‌ها رو بخونه. تعداد سوال‌ها برای صفحه‌ی شروع
    // از GET /count میاد
    let canSeeAnswerKey = false;
    if (role === 'Student') {
        const attempt = await prisma_1.prisma.examAttempt.findUnique({
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
            attempt.finishedAt !== null && (0, examTiming_1.isAnswerKeyReleased)(exam);
    }
    const questions = await (0, examQuestions_service_1.getExamQuestions)(exam.id);
    if (role === 'Student') {
        return res.json(questions.map((question) => ({
            id: question.id,
            examId: question.examId,
            text: question.textSnapshot,
            options: question.optionsSnapshot,
            ...(canSeeAnswerKey
                ? { correctOptionIndex: question.correctIndexSnapshot }
                : {}),
        })));
    }
    return res.json(questions.map(examQuestions_service_1.serializeExamQuestion));
}));
// فقط تعداد سوال‌ها (بدون متن/گزینه) - برای صفحه‌ی شروع آزمون قبل از start.
// مثل GET / برای دانشجو قبل از scheduledAt صفر برمی‌گردونه
router.get('/count', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const exam = await (0, examQuestions_service_1.loadExamOrThrow)(req.params.examId, sub, role);
    if (role === 'Student' && Date.now() < exam.scheduledAt.getTime()) {
        return res.json({ count: 0 });
    }
    const count = await prisma_1.prisma.examQuestion.count({
        where: { examId: exam.id },
    });
    return res.json({ count });
}));
exports.default = router;
