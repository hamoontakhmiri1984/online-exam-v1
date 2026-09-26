"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const joinCode_1 = require("../lib/joinCode");
const notifications_1 = require("../lib/notifications");
const asyncHandler_1 = require("../lib/asyncHandler");
const groupSchemas_1 = require("../validation/groupSchemas");
const quota_1 = require("../lib/quota");
const errors_1 = require("../lib/errors");
const rateLimiters_1 = require("../middleware/rateLimiters");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// شکل خروجی رو دقیقاً هم‌شکل Group تو client/src/api/groupApi.ts نگه می‌داریم
// (studentIds: string[] به‌جای آبجکت کامل کاربرها) تا وصل کردن فرانت به این
// روت‌ها بعداً فقط جایگزینی تابع باشه، نه تغییر تایپ‌ها
function serializeGroup(group) {
    return {
        id: group.id,
        name: group.name,
        category: group.category,
        instructorId: group.instructorId,
        joinCode: group.joinCode,
        studentIds: group.students.map((s) => s.id),
    };
}
const withStudents = { students: { select: { id: true } } };
// studentIds از بدنه‌ی درخواست میاد و مستقیم به connect/set می‌رفت - یعنی یه
// Instructor می‌تونست هر userId دلخواهی (Instructor/SuperAdmin دیگه، یا
// دانشجوی مدرس دیگه) رو به گروه خودش وصل کنه و بعد از GET /groups/:id لیستشون
// رو بخونه، یا با id ناموجود خطای ۵۰۰ بگیره. الان: همه‌ی idها باید واقعاً
// User با role=Student باشن، و برای Instructor فقط دانشجوهایی که از قبل عضو
// یکی از گروه‌های خودشن (عضویت جدید فقط با کد عضویت، POST /groups/join).
// پیام خطا عمداً یکسانه تا وجود/عدم وجود یه id لو نره.
async function resolveStudentIds(rawIds, role, instructorId) {
    const ids = [...new Set(rawIds)];
    if (ids.length === 0)
        return [];
    const valid = await prisma_1.prisma.user.count({
        where: {
            id: { in: ids },
            role: 'Student',
            ...(role === 'Instructor'
                ? { groupsMember: { some: { instructorId } } }
                : {}),
        },
    });
    if (valid !== ids.length) {
        throw (0, errors_1.badRequest)('لیست دانشجوها نامعتبره');
    }
    return ids.map((id) => ({ id }));
}
// دسترسی به لیست گروه‌ها بسته به نقشه: SuperAdmin همه رو می‌بینه، Instructor
// فقط گروه‌های خودش، Student فقط گروه‌هایی که عضوشونه - دقیقاً معادل
// visibleGroups/useGroups تو فرانت
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const where = role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
            ? { instructorId: sub }
            : { students: { some: { id: sub } } };
    const groups = await prisma_1.prisma.group.findMany({
        where,
        include: withStudents,
    });
    res.json(groups.map(serializeGroup));
}));
router.get('/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const group = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
        include: withStudents,
    });
    if (!group)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    const { role, sub } = req.user;
    const isOwner = role === 'Instructor' && group.instructorId === sub;
    const isMember = role === 'Student' && group.students.some((s) => s.id === sub);
    if (role !== 'SuperAdmin' && !isOwner && !isMember) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    res.json(serializeGroup(group));
}));
// فقط مدرس گروه می‌سازه؛ joinCode همیشه سمت سرور تولید می‌شه، نه چیزی که
// از بدنه‌ی درخواست بیاد
router.post('/', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = groupSchemas_1.createGroupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });
    const studentConnect = await resolveStudentIds(parsed.data.studentIds, req.user.role, req.user.sub);
    const joinCode = await (0, joinCode_1.generateUniqueJoinCode)();
    // محدودیت پلن - همون چیزی که PlanLimitModal سمت فرانت قبل از باز کردن فرم
    // چک می‌کنه؛ اینجا سمت سرور و *اتمیک با ساخت* اعمال می‌شه (چک و create
    // داخل یه تراکنش پشت قفل مدرس - lib/quota.ts). خطای ۴۰۳ همون شکل قبلی
    // {error, reason} رو داره (AppError → errorHandler)
    const group = await (0, quota_1.withQuotaLock)(req.user.sub, 'groups', 1, (db) => db.group.create({
        data: {
            name: parsed.data.name,
            category: parsed.data.category,
            instructorId: req.user.sub,
            joinCode,
            students: { connect: studentConnect },
        },
        include: withStudents,
    }));
    res.status(201).json(serializeGroup(group));
}));
// ویرایش (اسم/دسته‌بندی/لیست دانشجوها) - joinCode دست‌نخورده می‌مونه، دقیقاً
// مثل updateGroup تو mock. فقط مالک گروه (یا SuperAdmin) اجازه داره.
router.put('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    if (req.user.role === 'Instructor' &&
        existing.instructorId !== req.user.sub) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    const parsed = groupSchemas_1.updateGroupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });
    // برای SuperAdmin: هر Student معتبری؛ برای Instructor: طبق قاعده‌ی بالا
    // (دانشجوهای فعلیِ همین گروه هم عضو گروه خودش حساب می‌شن)
    const studentSet = await resolveStudentIds(parsed.data.studentIds, req.user.role, existing.instructorId);
    const group = await prisma_1.prisma.group.update({
        where: { id: req.params.id },
        data: {
            name: parsed.data.name,
            category: parsed.data.category,
            students: { set: studentSet },
        },
        include: withStudents,
    });
    res.json(serializeGroup(group));
}));
router.delete('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    if (req.user.role === 'Instructor' &&
        existing.instructorId !== req.user.sub) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    await prisma_1.prisma.group.delete({ where: { id: req.params.id } });
    res.status(204).end();
}));
// دانشجو با کد عضویت، خودش رو به گروه اضافه می‌کنه - idempotent (اگه از
// قبل عضو بود، خطا نمی‌ده و همون گروه رو برمی‌گردونه)
router.post('/join', (0, requireAuth_1.requireRole)('Student'), rateLimiters_1.joinGroupLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = groupSchemas_1.joinGroupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });
    const normalizedCode = parsed.data.joinCode.trim().toUpperCase();
    const group = await prisma_1.prisma.group.findUnique({
        where: { joinCode: normalizedCode },
        include: withStudents,
    });
    if (!group)
        return res.status(404).json({ error: 'کد عضویت نامعتبره' });
    const alreadyMember = group.students.some((s) => s.id === req.user.sub);
    if (!alreadyMember) {
        await prisma_1.prisma.group.update({
            where: { id: group.id },
            data: { students: { connect: { id: req.user.sub } } },
        });
        // اعلان برای خودِ دانشجو - دقیقاً معادل notifyStudentAddedToGroup تو mock
        // (client/src/api/notificationApi.ts) که از addStudentToGroup صدا زده می‌شد
        await (0, notifications_1.notifyUser)(req.user.sub, `به گروه «${group.name}» اضافه شدی`, 'people');
        // به‌علاوه: به مدرس هم خبر بده که یه دانشجوی جدید پیوست (چیزی که mock
        // نداشت ولی برای مدرس مفیده)
        await (0, notifications_1.notifyUser)(group.instructorId, `یه دانشجوی جدید به گروه «${group.name}» پیوست`, 'people');
    }
    const updated = await prisma_1.prisma.group.findUnique({
        where: { id: group.id },
        include: withStudents,
    });
    res.json(serializeGroup(updated));
}));
// کد قدیمی رو باطل و یه کد جدید می‌سازه - فقط مالک گروه یا SuperAdmin
router.post('/:id/regenerate-join-code', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    if (req.user.role === 'Instructor' &&
        existing.instructorId !== req.user.sub) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    const joinCode = await (0, joinCode_1.generateUniqueJoinCode)();
    const group = await prisma_1.prisma.group.update({
        where: { id: req.params.id },
        data: { joinCode },
        include: withStudents,
    });
    res.json(serializeGroup(group));
}));
exports.default = router;
