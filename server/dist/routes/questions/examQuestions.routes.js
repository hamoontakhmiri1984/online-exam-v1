"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/questions/examQuestions.routes.ts
const express_1 = require("express");
const requireAuth_1 = require("../../middleware/requireAuth");
const asyncHandler_1 = require("../../lib/asyncHandler");
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const examAccess_1 = require("../../lib/examAccess");
const quota_1 = require("../../lib/quota");
const examTiming_1 = require("../../lib/examTiming");
const questionSchemas_1 = require("../../validation/questionSchemas");
const examQuestions_service_1 = require("./examQuestions.service");
const router = (0, express_1.Router)({
    mergeParams: true,
});
router.use(requireAuth_1.requireAuth);
function serializeQuestion(question) {
    return {
        id: question.id,
        examId: question.examId,
        questionId: question.questionId,
        text: question.textSnapshot,
        options: question.optionsSnapshot,
        correctOptionIndex: question.correctIndexSnapshot,
    };
}
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam) {
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    }
    if (!allowed) {
        throw (0, errors_1.forbidden)();
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
    return res.json(questions.map(serializeQuestion));
}));
// فقط تعداد سوال‌ها (بدون متن/گزینه) - برای صفحه‌ی شروع آزمون قبل از start.
// مثل GET / برای دانشجو قبل از scheduledAt صفر برمی‌گردونه
router.get('/count', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam) {
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    }
    if (!allowed) {
        throw (0, errors_1.forbidden)();
    }
    if (role === 'Student' && Date.now() < exam.scheduledAt.getTime()) {
        return res.json({ count: 0 });
    }
    const count = await prisma_1.prisma.examQuestion.count({
        where: { examId: exam.id },
    });
    return res.json({ count });
}));
router.post('/', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam) {
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    }
    if (!allowed) {
        throw (0, errors_1.forbidden)();
    }
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    const parsed = questionSchemas_1.createQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    // چک سهمیه داخل همون تراکنشِ ساخت (پشت قفل مدرس) انجام می‌شه، نه جدا
    // قبلش - وگرنه درخواست‌های موازی همه از سقف رد می‌شدن (lib/quota.ts)
    const quotaGuard = role === 'Instructor'
        ? await (0, quota_1.prepareQuotaGuard)(sub, 'questions')
        : undefined;
    const question = await (0, examQuestions_service_1.createExamQuestion)(exam.id, parsed.data, quotaGuard);
    return res.status(201).json(serializeQuestion(question));
}));
router.post('/bulk', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam) {
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    }
    if (!allowed) {
        throw (0, errors_1.forbidden)();
    }
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    const parsed = questionSchemas_1.bulkQuestionsSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    const quotaGuard = role === 'Instructor'
        ? await (0, quota_1.prepareQuotaGuard)(sub, 'questions', parsed.data.length)
        : undefined;
    const questions = await (0, examQuestions_service_1.createExamQuestionsBulk)(exam.id, parsed.data, quotaGuard);
    return res.status(201).json(questions.map(serializeQuestion));
}));
router.put('/:questionId', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam) {
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    }
    if (!allowed) {
        throw (0, errors_1.forbidden)();
    }
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    const parsed = questionSchemas_1.updateQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    const question = await (0, examQuestions_service_1.updateExamQuestion)(exam.id, req.params.questionId, parsed.data);
    return res.json(serializeQuestion(question));
}));
router.delete('/:questionId', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam) {
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    }
    if (!allowed) {
        throw (0, errors_1.forbidden)();
    }
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    await (0, examQuestions_service_1.deleteExamQuestion)(exam.id, req.params.questionId);
    return res.status(204).end();
}));
exports.default = router;
