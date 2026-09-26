"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../../middleware/requireAuth");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const examAccess_1 = require("../../lib/examAccess");
const questionSchemas_1 = require("../../validation/questionSchemas");
const examQuestions_service_1 = require("./examQuestions.service");
const questionBankImport_service_1 = require("./questionBankImport.service");
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
router.post('/from-bank', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub, role } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam) {
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    }
    if (!allowed) {
        throw (0, errors_1.forbidden)();
    }
    (0, examQuestions_service_1.assertExamQuestionsEditable)(exam);
    const parsed = questionSchemas_1.addBankQuestionsToExamSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    // عمداً چک سهمیه‌ی پلن اینجا نیست: سوالِ ایمپورت‌شده از بانک تو
    // getInstructorUsage جدا شمرده نمی‌شه (همون سوالِ بانکه)، پس مصرفِ
    // جدیدی نداره. سهمیه موقع ساخت سوال تو بانک چک می‌شه
    const questions = (await (0, questionBankImport_service_1.importBankQuestionsToExam)(exam.id, parsed.data.questionIds, role === 'Instructor' ? sub : undefined));
    return res.status(201).json(questions.map(serializeQuestion));
}));
exports.default = router;
