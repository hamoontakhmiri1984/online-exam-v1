"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAST_SCHEDULE_TOLERANCE_MS = void 0;
exports.serializeExam = serializeExam;
exports.assertOwnsAllGroups = assertOwnsAllGroups;
exports.assertNotInPast = assertNotInPast;
exports.updateExam = updateExam;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const examAccess_1 = require("../../lib/examAccess");
const quota_1 = require("../../lib/quota");
const examLock_1 = require("../../lib/examLock");
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
// کمی تلورانس برای اختلاف ساعتِ مرورگر و سرور، تا «همین الان» رد نشه
exports.PAST_SCHEDULE_TOLERANCE_MS = 5 * 60_000;
function assertNotInPast(scheduledAt) {
    if (scheduledAt.getTime() < Date.now() - exports.PAST_SCHEDULE_TOLERANCE_MS) {
        throw (0, errors_1.badRequest)('زمان برگزاری آزمون نمی‌تونه گذشته باشه');
    }
}
const toMinute = (d) => Math.floor(d.getTime() / 60_000);
// آیا فیلدهای «قفل‌شونده بعد از شروع» (زمان/مدت/گروه‌ها) نسبت به current
// عوض شدن؟ مقایسه‌ی زمان تا دقیقه‌ست تا ثانیه/میلی‌ثانیه‌ی فرم ویرایش باعث
// رد شدنِ الکی نشه
function computeChangesLockedFields(current, newScheduledAt, newDurationMinutes, newGroupIds) {
    const currentGroupIds = new Set(current.groups.map((g) => g.id));
    const sameGroups = currentGroupIds.size === newGroupIds.size &&
        [...newGroupIds].every((id) => currentGroupIds.has(id));
    return (toMinute(newScheduledAt) !== toMinute(current.scheduledAt) ||
        newDurationMinutes !== current.durationMinutes ||
        !sameGroups);
}
// بعد از اینکه حتی یه دانشجو شروع کرده، زمان/مدت/گروه‌ها قفل‌ان - وگرنه
// expiresAt‌ـهای قبلاً ثبت‌شده با آزمون نمی‌خونن و دسترسیِ دانشجوها (عضویت
// گروه) وسط آزمون عوض می‌شد
function assertScheduleEditable(attemptCount, changesLockedFields) {
    if (attemptCount > 0 && changesLockedFields) {
        throw (0, errors_1.badRequest)('این آزمون قبلاً توسط دانشجو شروع شده - زمان، مدت و گروه‌هاش قابل تغییر نیستن');
    }
}
// همه‌ی قواعدِ ویرایشِ آزمون (مالکیتِ گروه، زمانِ گذشته، قفلِ فیلدها بعد از
// شروع، سهمیه‌ی activeExams) این‌جان - route فقط ورودی رو پارس و صدا می‌زنه.
//
// existing باید *قبل از* قفل خونده شده باشه (fail-fast سریع، بدون باز کردنِ
// تراکنش). چکِ قطعی با مقدارهای *بعد از قفل* دوباره داخل withExamWriteLock
// انجام می‌شه - چون existing می‌تونه بین این فراخوانی و گرفتنِ قفل، با یه
// ویرایش/شروعِ هم‌زمانِ دیگه کهنه شده باشه
async function updateExam(examId, role, sub, existing, data) {
    // چک مالکیت هم برای گروه‌های *جدیدی* که داره جایگزین می‌شن لازمه - وگرنه
    // یه Instructor که خودش مالک آزمونه می‌تونست بعداً یه گروهِ Instructor
    // دیگه رو به همون آزمون وصل کنه
    await assertOwnsAllGroups(data.groupIds, role, sub);
    const newScheduledAt = new Date(data.scheduledAt);
    const newGroupIds = new Set(data.groupIds);
    // زمان گذشته فقط وقتی رد می‌شه که زمانِ آزمون واقعاً تغییر کرده باشه؛
    // ویرایشِ بقیه‌ی فیلدهای آزمونِ قدیمی با همون زمان مجازه
    if (toMinute(newScheduledAt) !== toMinute(existing.scheduledAt)) {
        assertNotInPast(newScheduledAt);
    }
    assertScheduleEditable(existing._count.attempts, computeChangesLockedFields(existing, newScheduledAt, data.durationMinutes, newGroupIds));
    // سقف activeExams فقط موقع ساخت چک می‌شد؛ اینجا هم وقتی آزمونِ تمام‌شده
    // (غیرفعال) با ویرایش دوباره فعال می‌شه همون چک اعمال می‌شه. خودِ چک
    // داخل همون تراکنشِ update و پشت قفل مدرس انجام می‌شه (beforeExamLock)
    let quotaGuard;
    if (role === 'Instructor') {
        const now = Date.now();
        const wasActive = existing.scheduledAt.getTime() + existing.durationMinutes * 60_000 >
            now;
        const willBeActive = newScheduledAt.getTime() + data.durationMinutes * 60_000 > now;
        if (!wasActive && willBeActive) {
            quotaGuard = await (0, quota_1.prepareQuotaGuard)(sub, 'activeExams');
        }
    }
    // قفل مشترک با start (lib/examLock.ts): اگه دانشجویی بین چک‌های بالا و
    // این update شروع کرده باشه، اینجا (بعد از قفل) دیده می‌شه و تغییر رد می‌شه
    return (0, examLock_1.withExamWriteLock)(examId, async (tx, { attemptCount }) => {
        // مقدارهای فعلیِ آزمون رو *بعد از گرفتنِ قفل* دوباره می‌خونیم - نه
        // existing بالا (که قبل از قفل و شاید کهنه‌ست)
        const current = await tx.exam.findUniqueOrThrow({
            where: { id: examId },
            select: {
                scheduledAt: true,
                durationMinutes: true,
                groups: { select: { id: true } },
            },
        });
        assertScheduleEditable(attemptCount, computeChangesLockedFields(current, newScheduledAt, data.durationMinutes, newGroupIds));
        return tx.exam.update({
            where: { id: examId },
            data: {
                title: data.title,
                category: data.category,
                scheduledAt: newScheduledAt,
                durationMinutes: data.durationMinutes,
                allowReview: data.allowReview,
                groups: { set: data.groupIds.map((id) => ({ id })) },
            },
            include: examAccess_1.examInclude,
        });
    }, { beforeExamLock: quotaGuard });
}
