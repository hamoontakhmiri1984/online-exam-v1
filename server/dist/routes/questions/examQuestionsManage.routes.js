"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/questions/examQuestionsManage.routes.ts
const express_1 = require("express");
const requireAuth_1 = require("../../middleware/requireAuth");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const quota_1 = require("../../lib/quota");
const questionSchemas_1 = require("../../validation/questionSchemas");
const examQuestions_service_1 = require("./examQuestions.service");
const router = (0, express_1.Router)({
    mergeParams: true,
});
router.use(requireAuth_1.requireAuth);
router.use((0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'));
router.post('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const exam = await (0, examQuestions_service_1.loadExamOrThrow)(req.params.examId, sub, role);
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
    return res.status(201).json((0, examQuestions_service_1.serializeExamQuestion)(question));
}));
router.post('/bulk', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const exam = await (0, examQuestions_service_1.loadExamOrThrow)(req.params.examId, sub, role);
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    const parsed = questionSchemas_1.bulkQuestionsSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    const quotaGuard = role === 'Instructor'
        ? await (0, quota_1.prepareQuotaGuard)(sub, 'questions', parsed.data.length)
        : undefined;
    const questions = await (0, examQuestions_service_1.createExamQuestionsBulk)(exam.id, parsed.data, quotaGuard);
    return res.status(201).json(questions.map(examQuestions_service_1.serializeExamQuestion));
}));
router.put('/:questionId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const exam = await (0, examQuestions_service_1.loadExamOrThrow)(req.params.examId, sub, role);
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    const parsed = questionSchemas_1.updateQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    const question = await (0, examQuestions_service_1.updateExamQuestion)(exam.id, req.params.questionId, parsed.data);
    return res.json((0, examQuestions_service_1.serializeExamQuestion)(question));
}));
router.delete('/:questionId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const exam = await (0, examQuestions_service_1.loadExamOrThrow)(req.params.examId, sub, role);
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    await (0, examQuestions_service_1.deleteExamQuestion)(exam.id, req.params.questionId);
    return res.status(204).end();
}));
exports.default = router;
