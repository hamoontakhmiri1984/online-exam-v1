"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../../lib/prisma");
const requireAuth_1 = require("../../middleware/requireAuth");
const questionSchemas_1 = require("../../validation/questionSchemas");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const excelUpload_1 = require("../../lib/excelUpload");
const questionExcel_1 = require("../../lib/questionExcel");
const quota_1 = require("../../lib/quota");
const questionBanks_service_1 = require("./questionBanks.service");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth, (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'));
router.get('/:bankId/questions', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await (0, questionBanks_service_1.loadOwnedBank)(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const questions = await prisma_1.prisma.question.findMany({
        where: { bankId: bank.id },
        orderBy: { createdAt: 'asc' },
    });
    res.json(questions.map(questionBanks_service_1.serializeQuestion));
}));
router.post('/:bankId/questions', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await (0, questionBanks_service_1.loadOwnedBank)(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const parsed = questionSchemas_1.createQuestionSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    // محدودیت پلن فقط برای Instructor معنا داره - SuperAdmin معافه. چک و
    // ساخت اتمیک‌ان (تراکنش پشت قفل مدرس - lib/quota.ts)
    const question = await (0, quota_1.withQuotaForRole)(role, sub, 'questions', 1, (db) => db.question.create({ data: { ...parsed.data, bankId: bank.id } }));
    res.status(201).json((0, questionBanks_service_1.serializeQuestion)(question));
}));
// ایمپورت دسته‌ای (اکسل) - همه‌ی سوال‌های بدنه یه‌جا به همین بانک اضافه
// می‌شن. چک محدودیت پلن اینجا با count واقعی انجام می‌شه (نه count=1)،
// چون ممکنه فایل بزرگ‌تر از ظرفیت باقی‌مونده باشه
router.post('/:bankId/questions/bulk', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await (0, questionBanks_service_1.loadOwnedBank)(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const parsed = questionSchemas_1.bulkQuestionsSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    // ایمپورت دسته‌ای: کل دسته یا ساخته می‌شه یا هیچ‌کدوم (همون تراکنشِ
    // چکِ سهمیه)؛ تایم‌اوت بلندتر چون فایل‌های بزرگ چند صد insert دارن
    const created = await (0, quota_1.withQuotaForRole)(role, sub, 'questions', parsed.data.length, (db) => Promise.all(parsed.data.map((q) => db.question.create({ data: { ...q, bankId: bank.id } }))), { timeoutMs: 60_000 });
    res.status(201).json(created.map(questionBanks_service_1.serializeQuestion));
}));
// ایمپورت از فایل اکسل/CSV - همون منطق bulk بالا رو مصرف می‌کنه، فقط ورودی
// به‌جای JSON یه فایل multipart ـه که سمت سرور پارس می‌شه (lib/questionExcel).
// ردیف‌های خراب کل فایل رو باطل نمی‌کنن: سوال‌های سالم ساخته می‌شن و لیست
// خطاهای ردیف‌به‌ردیف هم تو پاسخ برمی‌گرده تا مدرس بفهمه کدوم سطر مشکل داشت.
router.post('/:bankId/questions/import-excel', (req, res, next) => {
    excelUpload_1.excelUpload.single('file')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next((0, errors_1.badRequest)('حجم فایل بیشتر از حد مجاز (۱۰ مگابایت) است'));
            }
            return next((0, errors_1.badRequest)('آپلود فایل با خطا مواجه شد'));
        }
        if (err)
            return next(err);
        next();
    });
}, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await (0, questionBanks_service_1.loadOwnedBank)(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    if (!req.file) {
        throw (0, errors_1.badRequest)('فایلی ارسال نشده');
    }
    const { questions, errors } = (0, questionExcel_1.parseQuestionsExcel)(req.file.buffer);
    // اگه هیچ ردیف سالمی نمونده (همه خطا داشتن)، چیزی ساخته نمی‌شه - فقط
    // لیست خطاها برمی‌گرده تا مدرس فایل رو تصحیح کنه
    if (questions.length === 0) {
        return res.status(400).json({
            error: 'هیچ سوال معتبری تو فایل پیدا نشد',
            created: [],
            errors,
        });
    }
    const created = await (0, quota_1.withQuotaForRole)(role, sub, 'questions', questions.length, (db) => Promise.all(questions.map((q) => db.question.create({ data: { ...q, bankId: bank.id } }))), { timeoutMs: 60_000 });
    res.status(201).json({
        created: created.map(questionBanks_service_1.serializeQuestion),
        errors,
    });
}));
router.put('/:bankId/questions/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed, question } = await (0, questionBanks_service_1.loadOwnedQuestion)(req.params.bankId, req.params.id, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    if (!question)
        throw (0, errors_1.notFound)('سوال یافت نشد');
    const parsed = questionSchemas_1.updateQuestionSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const updated = await prisma_1.prisma.question.update({
        where: { id: question.id },
        data: parsed.data,
    });
    res.json((0, questionBanks_service_1.serializeQuestion)(updated));
}));
router.delete('/:bankId/questions/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed, question } = await (0, questionBanks_service_1.loadOwnedQuestion)(req.params.bankId, req.params.id, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    if (!question)
        throw (0, errors_1.notFound)('سوال یافت نشد');
    await prisma_1.prisma.question.delete({ where: { id: question.id } });
    res.status(204).end();
}));
exports.default = router;
