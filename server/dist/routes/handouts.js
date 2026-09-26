"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const storage_1 = require("../lib/storage");
const objectCleanup_1 = require("../lib/objectCleanup");
const notifications_1 = require("../lib/notifications");
const handoutSchemas_1 = require("../validation/handoutSchemas");
const quota_1 = require("../lib/quota");
const objectKeys_1 = require("../lib/objectKeys");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// همون الگوی lessonSessions.ts: تو دیتابیس ستونش fileUrl ـه ولی چون از این
// به بعد فقط object key ذخیره می‌شه (نه URL قابل‌دسترس مستقیم)، تو خروجی
// JSON اسمش رو objectKey می‌ذاریم تا فرانت اشتباهی مستقیم به‌عنوان href
// استفاده‌ش نکنه - برای دانلود واقعی باید GET /handouts/:id/signed-url بزنه
function serializeHandout(h) {
    return {
        id: h.id,
        title: h.title,
        description: h.description ?? undefined,
        category: h.category,
        groupId: h.groupId,
        instructorId: h.instructorId,
        fileName: h.fileName,
        objectKey: h.fileUrl,
        fileSize: h.fileSize,
        createdAt: h.createdAt.toISOString(),
    };
}
// گروه‌هایی که یه دانشجو عضوشونه، با category/instructorId هرکدوم - برای
// تشخیص این‌که جزوه‌های «کل دسته» (بدون گروه خاص) کدوم‌ها رو باید ببینه:
// فقط دسته‌هایی که *از همون مدرسِ همون گروه* باشه، نه هر مدرسی با همون
// اسم دسته (وگرنه محتوای یه مدرس به دانشجوهای مدرس دیگه لو می‌رفت)
async function loadStudentGroupContext(studentId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: studentId },
        select: {
            groupsMember: {
                select: { id: true, category: true, instructorId: true },
            },
        },
    });
    return user?.groupsMember ?? [];
}
function studentVisibilityWhere(groups) {
    if (groups.length === 0) {
        // بدون هیچ گروهی، هیچ جزوه‌ای قابل‌دیدن نیست
        return { id: 'never-matches' };
    }
    const groupIds = groups.map((g) => g.id);
    return {
        OR: [
            { groupId: { in: groupIds } },
            {
                groupId: null,
                OR: groups.map((g) => ({
                    category: g.category,
                    instructorId: g.instructorId,
                })),
            },
        ],
    };
}
function studentCanSeeHandout(handout, groups) {
    if (handout.groupId) {
        return groups.some((g) => g.id === handout.groupId);
    }
    return groups.some((g) => g.category === handout.category && g.instructorId === handout.instructorId);
}
// دسترسی مالکیتی برای Instructor/SuperAdmin - دقیقاً هم‌الگوی
// loadOwnedBank تو questionBanks.ts / loadOwnedGroup تو groups.ts
async function loadOwnedHandout(id, userId, role) {
    const handout = await prisma_1.prisma.handout.findUnique({ where: { id } });
    if (!handout)
        return { handout: null, allowed: false };
    if (role === 'SuperAdmin')
        return { handout, allowed: true };
    return { handout, allowed: handout.instructorId === userId };
}
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    if (role === 'Student') {
        const groups = await loadStudentGroupContext(sub);
        const handouts = await prisma_1.prisma.handout.findMany({
            where: studentVisibilityWhere(groups),
            orderBy: { createdAt: 'desc' },
        });
        return res.json(handouts.map(serializeHandout));
    }
    const where = role === 'SuperAdmin' ? {} : { instructorId: sub };
    const handouts = await prisma_1.prisma.handout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
    res.json(handouts.map(serializeHandout));
}));
router.get('/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const handout = await prisma_1.prisma.handout.findUnique({
        where: { id: req.params.id },
    });
    if (!handout)
        throw (0, errors_1.notFound)('جزوه یافت نشد');
    if (role === 'Student') {
        const groups = await loadStudentGroupContext(sub);
        if (!studentCanSeeHandout(handout, groups))
            throw (0, errors_1.forbidden)();
        return res.json(serializeHandout(handout));
    }
    if (role !== 'SuperAdmin' && handout.instructorId !== sub) {
        throw (0, errors_1.forbidden)();
    }
    res.json(serializeHandout(handout));
}));
// فقط مدرس جزوه می‌سازه (برای خودش) - همون تصمیم بانک سوال/گروه
router.post('/', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = handoutSchemas_1.createHandoutSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const { sub } = req.user;
    const { groupId } = parsed.data;
    if (!(0, objectKeys_1.canUseObjectKeys)('lesson-attachments', sub, [parsed.data.objectKey])) {
        throw (0, errors_1.forbidden)('فایل انتخاب‌شده متعلق به تو نیست');
    }
    // اگه به یه گروه خاص وصل می‌شه، باید گروه خودِ همین مدرس باشه - وگرنه
    // یه مدرس می‌تونست با حدس‌زدن groupId جزوه رو به گروه یه مدرس دیگه بده
    if (groupId) {
        const group = await prisma_1.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw (0, errors_1.notFound)('گروه یافت نشد');
        if (group.instructorId !== sub)
            throw (0, errors_1.forbidden)();
    }
    // چک سهمیه و ساخت اتمیک (lib/quota.ts)
    const handout = await (0, quota_1.withQuotaLock)(sub, 'handouts', 1, (db) => db.handout.create({
        data: {
            title: parsed.data.title,
            description: parsed.data.description,
            category: parsed.data.category,
            groupId: groupId ?? null,
            instructorId: sub,
            fileName: parsed.data.fileName,
            fileUrl: parsed.data.objectKey,
            fileSize: parsed.data.fileSize,
        },
    }));
    // اعلان به دانشجوهای مخاطب - best-effort، جلوی موفقیت خودِ ساخت جزوه رو نمی‌گیره
    notifyAudienceAboutHandout(handout).catch((err) => console.error('notifyAudienceAboutHandout failed:', err));
    res.status(201).json(serializeHandout(handout));
}));
async function notifyAudienceAboutHandout(handout) {
    if (handout.groupId) {
        const group = await prisma_1.prisma.group.findUnique({
            where: { id: handout.groupId },
            include: { students: { select: { id: true } } },
        });
        if (!group)
            return;
        await Promise.all(group.students.map((s) => (0, notifications_1.notifyUser)(s.id, `جزوه‌ی جدید «${handout.title}» اضافه شد`, 'info')));
        return;
    }
    const groups = await prisma_1.prisma.group.findMany({
        where: { instructorId: handout.instructorId, category: handout.category },
        include: { students: { select: { id: true } } },
    });
    const studentIds = new Set();
    for (const g of groups) {
        for (const s of g.students)
            studentIds.add(s.id);
    }
    await Promise.all([...studentIds].map((id) => (0, notifications_1.notifyUser)(id, `جزوه‌ی جدید «${handout.title}» اضافه شد`, 'info')));
}
router.put('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { handout, allowed } = await loadOwnedHandout(req.params.id, sub, role);
    if (!handout)
        throw (0, errors_1.notFound)('جزوه یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const parsed = handoutSchemas_1.updateHandoutSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const { groupId } = parsed.data;
    if (role === 'Instructor' &&
        parsed.data.objectKey &&
        !(0, objectKeys_1.canUseObjectKeys)('lesson-attachments', sub, [parsed.data.objectKey], [handout.fileUrl])) {
        throw (0, errors_1.forbidden)('فایل انتخاب‌شده متعلق به تو نیست');
    }
    if (groupId) {
        const group = await prisma_1.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw (0, errors_1.notFound)('گروه یافت نشد');
        if (role === 'Instructor' && group.instructorId !== sub) {
            throw (0, errors_1.forbidden)();
        }
    }
    // فقط وقتی فایل واقعاً عوض شده (objectKey جدید اومده) فایل قدیمی رو از
    // bucket پاک می‌کنیم - وگرنه فایل فعلی دست‌نخورده می‌مونه
    const replacingFile = Boolean(parsed.data.objectKey) &&
        parsed.data.objectKey !== handout.fileUrl;
    const updated = await prisma_1.prisma.handout.update({
        where: { id: handout.id },
        data: {
            title: parsed.data.title,
            description: parsed.data.description,
            category: parsed.data.category,
            groupId: groupId ?? null,
            ...(parsed.data.objectKey
                ? {
                    fileName: parsed.data.fileName,
                    fileUrl: parsed.data.objectKey,
                    fileSize: parsed.data.fileSize,
                }
                : {}),
        },
    });
    // deleteUnreferencedObjects فقط وقتی پاک می‌کنه که هیچ جزوه/پیوست/جلسه‌ی
    // دیگه‌ای هنوز به همین کلید اشاره نکنه (قبلاً deleteObject مستقیم صدا
    // زده می‌شد و ممکن بود فایلِ مشترک از زیر پای رکورد دیگه پاک بشه)
    if (replacingFile) {
        await (0, objectCleanup_1.deleteUnreferencedObjects)([handout.fileUrl]);
    }
    res.json(serializeHandout(updated));
}));
router.delete('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { handout, allowed } = await loadOwnedHandout(req.params.id, sub, role);
    if (!handout)
        throw (0, errors_1.notFound)('جزوه یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    await prisma_1.prisma.handout.delete({ where: { id: handout.id } });
    await (0, objectCleanup_1.deleteUnreferencedObjects)([handout.fileUrl]);
    res.status(204).end();
}));
// لینک موقت دانلود - بعد از چک دسترسی (مالک/SuperAdmin یا دانشجوی مجاز)
router.get('/:id/signed-url', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const handout = await prisma_1.prisma.handout.findUnique({
        where: { id: req.params.id },
    });
    if (!handout)
        throw (0, errors_1.notFound)('جزوه یافت نشد');
    if (role === 'Student') {
        const groups = await loadStudentGroupContext(sub);
        if (!studentCanSeeHandout(handout, groups))
            throw (0, errors_1.forbidden)();
    }
    else if (role !== 'SuperAdmin' && handout.instructorId !== sub) {
        throw (0, errors_1.forbidden)();
    }
    const url = await (0, storage_1.getSignedDownloadUrl)(handout.fileUrl);
    res.json({ url });
}));
exports.default = router;
