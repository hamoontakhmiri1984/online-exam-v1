"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const requireAuth_1 = require("../../middleware/requireAuth");
const questionBankSchemas_1 = require("../../validation/questionBankSchemas");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const questionExcel_1 = require("../../lib/questionExcel");
const questionBanks_service_1 = require("./questionBanks.service");
// این کل فایل فقط برای Instructor/SuperAdmin معناداره - Student هیچ‌وقت
// مستقیم به بانک سوال دسترسی نداره (نه موقع اجرای آزمون - اونجا از
// ExamQuestion.snapshot می‌خونه، جای دیگه‌ای که فاز آزمون‌ساز/اجرا بهش می‌رسه)
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth, (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'));
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const where = role === 'SuperAdmin' ? {} : { instructorId: sub };
    const banks = await prisma_1.prisma.questionBank.findMany({
        where,
        include: { _count: { select: { questions: true } } },
        orderBy: { createdAt: 'asc' },
    });
    res.json(banks.map(questionBanks_service_1.serializeBank));
}));
// تمپلیت اکسل آماده برای ایمپورت - عمداً *قبل از* GET /:bankId تعریف شده
// چون اگه بعدش می‌بود، اکسپرس رشته‌ی «import-template» رو به‌عنوان بانک‌آیدی
// می‌گرفت (تطبیق روت‌ها به ترتیب تعریفه، نه به specificity)
router.get('/import-template', (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const buffer = (0, questionExcel_1.buildQuestionImportTemplate)();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="question-import-template.xlsx"');
    res.send(buffer);
}));
router.get('/:bankId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await (0, questionBanks_service_1.loadOwnedBank)(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const withCount = await prisma_1.prisma.questionBank.findUnique({
        where: { id: bank.id },
        include: { _count: { select: { questions: true } } },
    });
    res.json((0, questionBanks_service_1.serializeBank)(withCount));
}));
// فقط Instructor بانک می‌سازه (برای خودش) - SuperAdmin پنل محتوا نیست،
// پنل تننت/پلتفرمه (همون تصمیم قبلی پروژه)
router.post('/', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = questionBankSchemas_1.createQuestionBankSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const bank = await prisma_1.prisma.questionBank.create({
        data: {
            name: parsed.data.name,
            category: parsed.data.category,
            instructorId: req.user.sub,
        },
        include: { _count: { select: { questions: true } } },
    });
    res.status(201).json((0, questionBanks_service_1.serializeBank)(bank));
}));
router.put('/:bankId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await (0, questionBanks_service_1.loadOwnedBank)(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const parsed = questionBankSchemas_1.updateQuestionBankSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const updated = await prisma_1.prisma.questionBank.update({
        where: { id: bank.id },
        data: { name: parsed.data.name, category: parsed.data.category },
        include: { _count: { select: { questions: true } } },
    });
    res.json((0, questionBanks_service_1.serializeBank)(updated));
}));
// حذف بانک، سوال‌هاش رو هم cascade می‌کنه (schema.prisma: Question.bank
// onDelete Cascade). آزمون‌هایی که قبلاً از این سوال‌ها استفاده کرده بودن
// آسیب نمی‌بینن چون ExamQuestion یه snapshot مستقل نگه می‌داره - فقط لینک
// questionId ـشون null می‌شه (onDelete SetNull)
router.delete('/:bankId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await (0, questionBanks_service_1.loadOwnedBank)(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    await prisma_1.prisma.questionBank.delete({ where: { id: bank.id } });
    res.status(204).end();
}));
exports.default = router;
