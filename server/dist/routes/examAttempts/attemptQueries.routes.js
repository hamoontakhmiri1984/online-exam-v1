"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const examAccess_1 = require("../../lib/examAccess");
const attemptFinalize_1 = require("../../lib/attemptFinalize");
const requireAuth_1 = require("../../middleware/requireAuth");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const examAttempts_service_1 = require("./examAttempts.service");
const router = (0, express_1.Router)({ mergeParams: true });
router.use(requireAuth_1.requireAuth);
router.get('/', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, role);
    if (!exam)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    // attempt‌های رهاشده‌ی این آزمون قبل از لیست شدن بسته می‌شن
    await (0, attemptFinalize_1.finalizeExpiredAttempts)({ examId: exam.id });
    const attempts = await prisma_1.prisma.examAttempt.findMany({
        where: { examId: exam.id, finishedAt: { not: null } },
    });
    res.json(attempts.map(examAttempts_service_1.serializeAttempt));
}));
router.get('/me', (0, requireAuth_1.requireRole)('Student'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.examId, sub, 'Student');
    if (!exam)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    await (0, attemptFinalize_1.finalizeExpiredAttempts)({ examId: exam.id, studentId: sub });
    const attempt = await prisma_1.prisma.examAttempt.findFirst({
        where: { examId: exam.id, studentId: sub },
    });
    if (!attempt)
        throw (0, errors_1.notFound)('هنوز تو این آزمون شرکت نکردی');
    // در حال انجام (هنوز finish نشده): answers همیشه برمی‌گرده - برای
    // resume بعد از رفرش لازمه. محدودیت allowReview فقط بعد از پایان
    // آزمون معنی داره، نه وسط انجامش
    if (attempt.finishedAt && !exam.allowReview) {
        return res.json({ ...(0, examAttempts_service_1.serializeAttempt)(attempt), answers: undefined });
    }
    res.json((0, examAttempts_service_1.serializeAttempt)(attempt));
}));
exports.default = router;
