"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const questionBankSchemas_1 = require("../validation/questionBankSchemas");
const questionSchemas_1 = require("../validation/questionSchemas");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const excelUpload_1 = require("../lib/excelUpload");
const questionExcel_1 = require("../lib/questionExcel");
const quota_1 = require("../lib/quota");
// این کل فایل (چه مدیریت خودِ بانک، چه سوال‌های داخلش) فقط برای
// Instructor/SuperAdmin معناداره - Student هیچ‌وقت مستقیم به بانک سوال
// دسترسی نداره (نه موقع اجرای آزمون - اونجا از ExamQuestion.snapshot
// می‌خونه، جای دیگه‌ای که فاز آزمون‌ساز/اجرا بهش می‌رسه)
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth, (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'));
function serializeBank(bank) {
    return {
        id: bank.id,
        name: bank.name,
        category: bank.category,
        instructorId: bank.instructorId,
        questionCount: bank._count?.questions ?? 0,
    };
}
function serializeQuestion(q) {
    return {
        id: q.id,
        bankId: q.bankId,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        difficulty: q.difficulty,
    };
}
// Instructor فقط بانک‌های خودش رو می‌بینه/مدیریت می‌کنه؛ SuperAdmin به همه
// دسترسی داره (دقیقاً هم‌الگوی groups.ts/exams.ts)
async function loadOwnedBank(bankId, userId, role) {
    const bank = await prisma_1.prisma.questionBank.findUnique({ where: { id: bankId } });
    if (!bank)
        return { bank: null, allowed: false };
    if (role === 'SuperAdmin')
        return { bank, allowed: true };
    return { bank, allowed: bank.instructorId === userId };
}
// ---------------------------------------------------------------------------
// بانک‌ها
// ---------------------------------------------------------------------------
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const where = role === 'SuperAdmin' ? {} : { instructorId: sub };
    const banks = await prisma_1.prisma.questionBank.findMany({
        where,
        include: { _count: { select: { questions: true } } },
        orderBy: { createdAt: 'asc' },
    });
    res.json(banks.map(serializeBank));
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
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const withCount = await prisma_1.prisma.questionBank.findUnique({
        where: { id: bank.id },
        include: { _count: { select: { questions: true } } },
    });
    res.json(serializeBank(withCount));
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
    res.status(201).json(serializeBank(bank));
}));
router.put('/:bankId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
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
    res.json(serializeBank(updated));
}));
// حذف بانک، سوال‌هاش رو هم cascade می‌کنه (schema.prisma: Question.bank
// onDelete Cascade). آزمون‌هایی که قبلاً از این سوال‌ها استفاده کرده بودن
// آسیب نمی‌بینن چون ExamQuestion یه snapshot مستقل نگه می‌داره - فقط لینک
// questionId ـشون null می‌شه (onDelete SetNull)
router.delete('/:bankId', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    await prisma_1.prisma.questionBank.delete({ where: { id: bank.id } });
    res.status(204).end();
}));
// ---------------------------------------------------------------------------
// سوال‌های داخل یه بانک
// ---------------------------------------------------------------------------
router.get('/:bankId/questions', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank)
        throw (0, errors_1.notFound)('بانک سوال یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const questions = await prisma_1.prisma.question.findMany({
        where: { bankId: bank.id },
        orderBy: { createdAt: 'asc' },
    });
    res.json(questions.map(serializeQuestion));
}));
router.post('/:bankId/questions', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
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
    res.status(201).json(serializeQuestion(question));
}));
// ایمپورت دسته‌ای (اکسل) - همه‌ی سوال‌های بدنه یه‌جا به همین بانک اضافه
// می‌شن. چک محدودیت پلن اینجا با count واقعی انجام می‌شه (نه count=1)،
// چون ممکنه فایل بزرگ‌تر از ظرفیت باقی‌مونده باشه
router.post('/:bankId/questions/bulk', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
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
    res.status(201).json(created.map(serializeQuestion));
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
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
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
        created: created.map(serializeQuestion),
        errors,
    });
}));
// دسترسی به تک‌تک سوال‌ها همیشه از طریق بانکِ والدشه (نه مستقیم از روی
// questionId)، تا هیچ‌وقت نشه با حدس‌زدن یه id سوالِ یه بانکِ دیگه رو
// ویرایش/حذف کرد
async function loadOwnedQuestion(bankId, questionId, userId, role) {
    const { bank, allowed } = await loadOwnedBank(bankId, userId, role);
    if (!bank || !allowed)
        return { bank, allowed, question: null };
    const question = await prisma_1.prisma.question.findUnique({
        where: { id: questionId },
    });
    if (!question || question.bankId !== bank.id) {
        return { bank, allowed, question: null };
    }
    return { bank, allowed, question };
}
router.put('/:bankId/questions/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed, question } = await loadOwnedQuestion(req.params.bankId, req.params.id, sub, role);
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
    res.json(serializeQuestion(updated));
}));
router.delete('/:bankId/questions/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { bank, allowed, question } = await loadOwnedQuestion(req.params.bankId, req.params.id, sub, role);
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
