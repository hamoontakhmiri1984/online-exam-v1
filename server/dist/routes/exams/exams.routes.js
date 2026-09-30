"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const requireAuth_1 = require("../../middleware/requireAuth");
const examAccess_1 = require("../../lib/examAccess");
const examSchemas_1 = require("../../validation/examSchemas");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const quota_1 = require("../../lib/quota");
const examLock_1 = require("../../lib/examLock");
const exams_service_1 = require("./exams.service");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// لیست آزمون‌ها بسته به نقش: SuperAdmin همه، Instructor فقط آزمون‌هایی که
// روی حداقل یکی از گروه‌های خودشه، Student فقط آزمون‌هایی که عضو حداقل
// یکی از گروه‌هاشه - دقیقاً هم‌خانواده‌ی همون منطقی که groups.ts برای
// لیست گروه‌ها داره
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const where = role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
            ? { instructorId: sub }
            : {
                status: 'Published',
                groups: { some: { students: { some: { id: sub } } } },
            };
    const exams = await prisma_1.prisma.exam.findMany({
        where,
        include: examAccess_1.examInclude,
        orderBy: { scheduledAt: 'desc' },
    });
    res.json(exams.map(exams_service_1.serializeExam));
}));
router.get('/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.id, sub, role);
    if (!exam)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    res.json((0, exams_service_1.serializeExam)(exam));
}));
router.post('/', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const parsed = examSchemas_1.createExamSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    (0, exams_service_1.assertNotInPast)(new Date(parsed.data.scheduledAt));
    await (0, exams_service_1.assertOwnsAllGroups)(parsed.data.groupIds, role, sub);
    // محدودیت پلن فقط برای Instructor معنا داره؛ چک و ساخت اتمیک‌ان (یه
    // تراکنش پشت قفل مدرس - lib/quota.ts)
    const exam = await (0, quota_1.withQuotaForRole)(role, sub, 'activeExams', 1, (db) => db.exam.create({
        data: {
            instructorId: sub,
            title: parsed.data.title,
            category: parsed.data.category,
            scheduledAt: new Date(parsed.data.scheduledAt),
            durationMinutes: parsed.data.durationMinutes,
            allowReview: parsed.data.allowReview,
            groups: { connect: parsed.data.groupIds.map((id) => ({ id })) },
        },
        include: examAccess_1.examInclude,
    }));
    res.status(201).json((0, exams_service_1.serializeExam)(exam));
}));
router.put('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { exam: existing, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.id, sub, role);
    if (!existing)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const parsed = examSchemas_1.updateExamSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    // قواعد ویرایش (مالکیت گروه، زمان گذشته، قفل فیلدها بعد از شروع،
    // سهمیه‌ی activeExams) داخل exams.service.ts هستن
    const exam = await (0, exams_service_1.updateExam)(req.params.id, role, sub, existing, parsed.data);
    res.json((0, exams_service_1.serializeExam)(exam));
}));
// Draft → Published: بعد از این دیگه دانشجوهای گروه‌های وصل‌شده می‌تونن
// ببینینش (البته هنوز تابع timing-gate رو scheduledAt هم سرجاشه). قبل از
// publish حداقل باید یه سوال داشته باشه - یه آزمون خالیِ published معنایی
// نداره و دانشجو رو وسط اجرا با صفحه‌ی خالی روبه‌رو می‌کنه
router.post('/:id/publish', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.id, sub, role);
    if (!exam)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    if (exam.status === 'Published') {
        return res.json((0, exams_service_1.serializeExam)(exam));
    }
    const questionCount = await prisma_1.prisma.examQuestion.count({
        where: { examId: exam.id },
    });
    if (questionCount === 0) {
        throw (0, errors_1.badRequest)('قبل از انتشار، آزمون باید حداقل یه سوال داشته باشه');
    }
    const updated = await prisma_1.prisma.exam.update({
        where: { id: exam.id },
        data: { status: 'Published' },
        include: examAccess_1.examInclude,
    });
    res.json((0, exams_service_1.serializeExam)(updated));
}));
// Published → Draft: برعکسِ publish. اگه حتی یه دانشجو هم آزمون رو شروع
// کرده باشه (چه هنوز در حالِ انجام چه تمام‌شده)، اجازه نمی‌دیم - چون
// loadAccessibleExam دسترسیِ دانشجو رو منوطِ به Published بودنه؛ اگه وسطِ
// آزمونِ یه دانشجو status رو Draft کنیم، همون درخواستِ finish بعدیش با
// forbidden رد می‌شه و جوابش برای همیشه گم می‌شه
router.post('/:id/unpublish', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.id, sub, role);
    if (!exam)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    if (exam.status === 'Draft') {
        return res.json((0, exams_service_1.serializeExam)(exam));
    }
    if (exam._count.attempts > 0) {
        throw (0, errors_1.badRequest)('این آزمون قبلاً حداقل توسطِ یه دانشجو شروع شده - نمی‌شه لغوِ انتشارش کرد');
    }
    // قفل مشترک با start: اگه دانشجویی بین چک بالا و این update شروع کرده
    // باشه، اینجا (بعد از قفل) دیده می‌شه و لغو انتشار رد می‌شه
    const updated = await (0, examLock_1.withExamWriteLock)(exam.id, async (tx, { attemptCount }) => {
        if (attemptCount > 0) {
            throw (0, errors_1.badRequest)('این آزمون قبلاً حداقل توسطِ یه دانشجو شروع شده - نمی‌شه لغوِ انتشارش کرد');
        }
        return tx.exam.update({
            where: { id: exam.id },
            data: { status: 'Draft' },
            include: examAccess_1.examInclude,
        });
    });
    res.json((0, exams_service_1.serializeExam)(updated));
}));
router.delete('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.id, sub, role);
    if (!exam)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    await prisma_1.prisma.exam.delete({ where: { id: req.params.id } });
    res.status(204).end();
}));
exports.default = router;
