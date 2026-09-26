"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const examAccess_1 = require("../lib/examAccess");
const examSchemas_1 = require("../validation/examSchemas");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const quota_1 = require("../lib/quota");
const examLock_1 = require("../lib/examLock");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// شکل خروجی دقیقاً همون Exam ـه که client/src/api/examApi.ts انتظارش رو
// داره - status/participants هم اینجا محاسبه می‌شن (طبق تصمیم معماریِ
// schema.prisma: این دو تا ذخیره نمی‌شن، derived ان)
function serializeExam(exam) {
    const now = Date.now();
    const status = exam.status === 'Draft'
        ? 'draft'
        : exam.scheduledAt.getTime() + exam.durationMinutes * 60_000 <= now
            ? 'completed'
            : 'upcoming';
    return {
        id: exam.id,
        title: exam.title,
        category: exam.category,
        groupIds: exam.groups.map((g) => g.id),
        date: exam.scheduledAt.toISOString(),
        participants: exam._count.attempts,
        status,
        durationMinutes: exam.durationMinutes,
        allowReview: exam.allowReview,
    };
}
// یه Instructor نباید بتونه آزمون رو به گروهی که مال خودش نیست وصل کنه
// (نه موقع ساخت، نه موقع ویرایش) - SuperAdmin از این چک معافه. اگه
// groupIds خالی باشه، چیزی برای چک کردن نیست
async function assertOwnsAllGroups(groupIds, role, userId) {
    if (role === 'SuperAdmin' || groupIds.length === 0)
        return;
    const owned = await prisma_1.prisma.group.count({
        where: { id: { in: groupIds }, instructorId: userId },
    });
    if (owned !== groupIds.length) {
        throw (0, errors_1.forbidden)('نمی‌تونی آزمون رو به گروهی که مال تو نیست وصل کنی');
    }
}
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
    res.json(exams.map(serializeExam));
}));
router.get('/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { exam, allowed } = await (0, examAccess_1.loadAccessibleExam)(req.params.id, sub, role);
    if (!exam)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    res.json(serializeExam(exam));
}));
// کمی تلورانس برای اختلاف ساعتِ مرورگر و سرور، تا «همین الان» رد نشه
const PAST_SCHEDULE_TOLERANCE_MS = 5 * 60_000;
function assertNotInPast(scheduledAt) {
    if (scheduledAt.getTime() < Date.now() - PAST_SCHEDULE_TOLERANCE_MS) {
        throw (0, errors_1.badRequest)('زمان برگزاری آزمون نمی‌تونه گذشته باشه');
    }
}
router.post('/', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const parsed = examSchemas_1.createExamSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    assertNotInPast(new Date(parsed.data.scheduledAt));
    await assertOwnsAllGroups(parsed.data.groupIds, role, sub);
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
    res.status(201).json(serializeExam(exam));
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
    // چک مالکیت هم برای گروه‌های *جدیدی* که داره جایگزین می‌شن لازمه - وگرنه
    // یه Instructor که خودش مالک آزمونه می‌تونست بعداً یه گروهِ Instructor
    // دیگه رو به همون آزمون وصل کنه
    await assertOwnsAllGroups(parsed.data.groupIds, role, sub);
    const newScheduledAt = new Date(parsed.data.scheduledAt);
    // زمان گذشته فقط وقتی رد می‌شه که زمانِ آزمون واقعاً تغییر کرده باشه؛
    // ویرایشِ بقیه‌ی فیلدهای آزمونِ قدیمی با همون زمان مجازه (مقایسه تا دقیقه)
    if (Math.floor(newScheduledAt.getTime() / 60_000) !==
        Math.floor(existing.scheduledAt.getTime() / 60_000)) {
        assertNotInPast(newScheduledAt);
    }
    // بعد از اینکه حتی یه دانشجو شروع کرده، زمان/مدت/گروه‌ها قفل‌ان - وگرنه
    // expiresAt‌ـهای قبلاً ثبت‌شده با آزمون نمی‌خونن و دسترسیِ دانشجوها
    // (عضویت گروه) وسط آزمون عوض می‌شد. مقایسه‌ی زمان تا دقیقه‌ست تا
    // ثانیه/میلی‌ثانیه‌ی فرم ویرایش باعث رد شدنِ الکی نشه.
    // این نسخه‌ی مقایسه با existing (قبل از قفل خونده شده) فقط fail-fast
    // ـه - صرفاً برای رد سریع درخواستِ واضحاً غیرمجاز، بدون باز کردنِ
    // تراکنش. چک قطعی، با مقدارهای *بعد از قفل*، پایین‌تر تو
    // withExamWriteLock دوباره انجام می‌شه (نگاه کن به کامنتِ اونجا) - چون
    // existing می‌تونه بین این لحظه و گرفتنِ قفل، با یه ویرایش/شروعِ
    // هم‌زمانِ دیگه کهنه شده باشه: اگه فقط از همین changesLockedFields
    // استفاده می‌شد، یه فرمِ قدیمی (که خودش چیزی جز مثلاً عنوان رو عوض
    // نکرده) می‌تونست زمان/مدت/گروه‌هایی که همین تازگی (بعد از شروعِ اولین
    // attempt) قفل شدن رو بی‌سروصدا با مقدارهای کهنه‌ی خودِ فرم بازنویسی کنه
    const toMinute = (d) => Math.floor(d.getTime() / 60_000);
    const newGroupIds = new Set(parsed.data.groupIds);
    const computeChangesLockedFields = (current) => {
        const currentGroupIds = new Set(current.groups.map((g) => g.id));
        const sameGroups = currentGroupIds.size === newGroupIds.size &&
            [...newGroupIds].every((id) => currentGroupIds.has(id));
        return (toMinute(newScheduledAt) !== toMinute(current.scheduledAt) ||
            parsed.data.durationMinutes !== current.durationMinutes ||
            !sameGroups);
    };
    const assertScheduleEditable = (attemptCount, changesLockedFields) => {
        if (attemptCount > 0 && changesLockedFields) {
            throw (0, errors_1.badRequest)('این آزمون قبلاً توسط دانشجو شروع شده - زمان، مدت و گروه‌هاش قابل تغییر نیستن');
        }
    };
    assertScheduleEditable(existing._count.attempts, computeChangesLockedFields(existing));
    // سقف activeExams فقط موقع ساخت چک می‌شد؛ اینجا هم وقتی آزمونِ تمام‌شده
    // (غیرفعال) با ویرایش دوباره فعال می‌شه همون چک اعمال می‌شه. خودِ چک
    // داخل همون تراکنشِ update و پشت قفل مدرس انجام می‌شه (beforeExamLock
    // پایین‌تر)، نه اینجا
    let quotaGuard;
    if (role === 'Instructor') {
        const now = Date.now();
        const wasActive = existing.scheduledAt.getTime() + existing.durationMinutes * 60_000 >
            now;
        const willBeActive = newScheduledAt.getTime() + parsed.data.durationMinutes * 60_000 > now;
        if (!wasActive && willBeActive) {
            quotaGuard = await (0, quota_1.prepareQuotaGuard)(sub, 'activeExams');
        }
    }
    // قفل مشترک با start (lib/examLock.ts): اگه دانشجویی بین چک بالا و این
    // update شروع کرده باشه، اینجا (بعد از قفل) دیده می‌شه و تغییر رد می‌شه
    const exam = await (0, examLock_1.withExamWriteLock)(req.params.id, async (tx, { attemptCount }) => {
        // مقدارهای فعلیِ آزمون رو *بعد از گرفتنِ قفل* دوباره می‌خونیم - نه
        // existing بالا (که قبل از قفل و شاید کهنه‌ست). lockExamForUpdate
        // فقط ردیف رو قفل می‌کنه و چیزی برنمی‌گردونه، پس این select همون
        // آخرین مقدارِ commit‌شده رو می‌بینه (READ COMMITTED + قفلِ گرفته‌شده)
        const current = await tx.exam.findUniqueOrThrow({
            where: { id: req.params.id },
            select: {
                scheduledAt: true,
                durationMinutes: true,
                groups: { select: { id: true } },
            },
        });
        assertScheduleEditable(attemptCount, computeChangesLockedFields(current));
        return tx.exam.update({
            where: { id: req.params.id },
            data: {
                title: parsed.data.title,
                category: parsed.data.category,
                scheduledAt: newScheduledAt,
                durationMinutes: parsed.data.durationMinutes,
                allowReview: parsed.data.allowReview,
                groups: { set: parsed.data.groupIds.map((id) => ({ id })) },
            },
            include: examAccess_1.examInclude,
        });
    }, { beforeExamLock: quotaGuard });
    res.json(serializeExam(exam));
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
        return res.json(serializeExam(exam));
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
    res.json(serializeExam(updated));
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
        return res.json(serializeExam(exam));
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
    res.json(serializeExam(updated));
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
