"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeHandout = serializeHandout;
exports.loadStudentGroupContext = loadStudentGroupContext;
exports.studentVisibilityWhere = studentVisibilityWhere;
exports.studentCanSeeHandout = studentCanSeeHandout;
exports.loadOwnedHandout = loadOwnedHandout;
exports.notifyAudienceAboutHandout = notifyAudienceAboutHandout;
const prisma_1 = require("../../lib/prisma");
const notifications_1 = require("../../lib/notifications");
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
// اعلان به دانشجوهای مخاطب - best-effort، جلوی موفقیت خودِ ساخت جزوه رو نمی‌گیره
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
