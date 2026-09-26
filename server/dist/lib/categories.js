"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCategoryName = normalizeCategoryName;
exports.serializeCategory = serializeCategory;
exports.listCategoriesForInstructor = listCategoriesForInstructor;
exports.listCategoriesForAdmin = listCategoriesForAdmin;
exports.proposeCategory = proposeCategory;
exports.adminCreateCategory = adminCreateCategory;
exports.approveCategory = approveCategory;
exports.deleteOrRejectCategory = deleteOrRejectCategory;
exports.renameCategory = renameCategory;
const prisma_1 = require("./prisma");
const notifications_1 = require("./notifications");
const errors_1 = require("./errors");
// دقیقاً همون پترنِ normalizeUsername (lib/username.ts) - trim + lower-case
// تا «ریاضی »، «ریاضی» و «RIYAZI»/«Riyazi» به‌عنوان یه دسته حساب بشن. از
// toLocaleLowerCase (نه toLowerCase) استفاده می‌کنیم چون ورودی می‌تونه
// فارسی/عربی هم باشه.
function normalizeCategoryName(name) {
    return name.trim().toLocaleLowerCase();
}
function serializeCategory(category) {
    return {
        id: category.id,
        name: category.name,
        status: category.status,
        proposedById: category.proposedById ?? undefined,
        createdAt: category.createdAt.toISOString(),
    };
}
// لیستِ قابل‌دیدنِ یه مدرسِ خاص برای پر کردن دراپ‌داون: همه‌ی دسته‌های
// Approved + پیشنهادهای Pending خودِ همین مدرس (که هنوز برای بقیه دیده
// نمی‌شن ولی خودش باید بلافاصله بتونه ازشون تو فرم استفاده کنه)
async function listCategoriesForInstructor(instructorId) {
    const categories = await prisma_1.prisma.category.findMany({
        where: {
            OR: [{ status: 'Approved' }, { proposedById: instructorId }],
        },
        orderBy: { name: 'asc' },
    });
    return categories.map(serializeCategory);
}
async function listCategoriesForAdmin(status) {
    const categories = await prisma_1.prisma.category.findMany({
        where: status ? { status } : undefined,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    return categories.map(serializeCategory);
}
// عملیات idempotent: اگه دسته‌ای با همین نامِ نرمالایزشده از قبل باشه (چه
// Approved چه Pending، مال هرکسی)، همونو برمی‌گردونه به‌جای ساختِ تکراری.
// فقط وقتی واقعاً وجود نداره یه ردیفِ Pendingِ جدید می‌سازه و SuperAdmin رو
// نوتیف می‌کنه.
async function proposeCategory(instructorId, rawName) {
    const name = rawName.trim();
    const nameNormalized = normalizeCategoryName(name);
    const existing = await prisma_1.prisma.category.findUnique({
        where: { nameNormalized },
    });
    if (existing) {
        return { category: serializeCategory(existing), created: false };
    }
    const created = await prisma_1.prisma.category.create({
        data: {
            name,
            nameNormalized,
            proposedById: instructorId,
            status: 'Pending',
        },
    });
    const proposer = await prisma_1.prisma.user.findUnique({
        where: { id: instructorId },
    });
    (0, notifications_1.notifyRoles)(['SuperAdmin'], `${proposer?.name || 'یه مدرس'} دسته‌بندیِ جدیدِ «${name}» رو پیشنهاد داد`, 'info').catch((err) => console.error('notifyRoles failed:', err));
    return { category: serializeCategory(created), created: true };
}
// فقط برای SuperAdmin: اضافه‌کردنِ مستقیمِ یه دسته که همون لحظه Approved‌ـه
// (نیازی به تاییدِ خودش نداره چون خودش تاییدکننده‌ست)
async function adminCreateCategory(name) {
    const trimmed = name.trim();
    const nameNormalized = normalizeCategoryName(trimmed);
    const existing = await prisma_1.prisma.category.findUnique({
        where: { nameNormalized },
    });
    if (existing) {
        throw (0, errors_1.conflict)('این دسته‌بندی از قبل وجود داره');
    }
    const created = await prisma_1.prisma.category.create({
        data: { name: trimmed, nameNormalized, status: 'Approved' },
    });
    return serializeCategory(created);
}
async function approveCategory(id) {
    const category = await prisma_1.prisma.category.findUnique({ where: { id } });
    if (!category)
        throw (0, errors_1.notFound)('دسته‌بندی پیدا نشد');
    const updated = await prisma_1.prisma.category.update({
        where: { id },
        data: { status: 'Approved' },
    });
    if (updated.proposedById) {
        (0, notifications_1.notifyUser)(updated.proposedById, `دسته‌بندیِ پیشنهادیت «${updated.name}» تایید شد`, 'award').catch((err) => console.error('notifyUser failed:', err));
    }
    return serializeCategory(updated);
}
// شمارشِ محل‌هایی که یه دسته الان واقعاً توش استفاده شده - قبل از حذف/رد
// باید صفر باشه، وگرنه رکورد موجود با یه category یتیم (که دیگه تو هیچ
// فهرستی نیست) می‌مونه. هر جدولی که category رو به‌صورت رشته نگه می‌داره
// باید هم اینجا باشه هم تو cascade ـِ renameCategory (مثلاً دسترسیِ دانشجو
// به جزوه‌ها با تطبیقِ دقیقِ رشته‌ی category گروه و جزوه حساب می‌شه)
async function countCategoryUsage(name) {
    const [groups, exams, sessions, banks, handouts] = await Promise.all([
        prisma_1.prisma.group.count({ where: { category: name } }),
        prisma_1.prisma.exam.count({ where: { category: name } }),
        prisma_1.prisma.lessonSession.count({ where: { category: name } }),
        prisma_1.prisma.questionBank.count({ where: { category: name } }),
        prisma_1.prisma.handout.count({ where: { category: name } }),
    ]);
    return groups + exams + sessions + banks + handouts;
}
// رد یه پیشنهادِ Pending یا حذفِ یه دسته‌ی Approved. تو هر دو حالت اگه دسته
// جایی استفاده شده باشه، رد/حذف رو نمی‌پذیریم: پیشنهاددهنده همون لحظه‌ی
// پیشنهاد می‌تونه دسته‌ی Pending خودش رو تو فرم‌ها بذاره (listCategoriesForInstructor)،
// پس Pending بودن به معنی «استفاده‌نشده» نیست - وگرنه اون رکوردها با یه
// categoryِ یتیم می‌موندن.
async function deleteOrRejectCategory(id) {
    const category = await prisma_1.prisma.category.findUnique({ where: { id } });
    if (!category)
        throw (0, errors_1.notFound)('دسته‌بندی پیدا نشد');
    const usage = await countCategoryUsage(category.name);
    if (usage > 0) {
        const count = usage.toLocaleString('fa-IR');
        throw (0, errors_1.conflict)(category.status === 'Approved'
            ? `این دسته‌بندی تو ${count} مورد استفاده شده - اول باید تغییرشون بدی یا از تغییرِ نام استفاده کنی`
            : `این پیشنهاد همین حالا تو ${count} مورد استفاده شده - به‌جای رد کردن، تاییدش کن یا نامش رو تغییر بده`);
    }
    await prisma_1.prisma.category.delete({ where: { id } });
    if (category.status === 'Pending' && category.proposedById) {
        (0, notifications_1.notifyUser)(category.proposedById, `دسته‌بندیِ پیشنهادیت «${category.name}» رد شد`, 'info').catch((err) => console.error('notifyUser failed:', err));
    }
}
// تغییرِ نامِ یه دسته با cascade رویِ هر جایی که دقیقاً همین رشته رو به‌عنوانِ
// category ذخیره کرده (Group/Exam/LessonSession/QuestionBank/Handout) - همه‌شون تو یه تراکنش،
// وگرنه ممکنه دسته عوض بشه ولی بعضی رکوردها با اسمِ قدیمی جا بمونن.
async function renameCategory(id, rawNewName) {
    const newName = rawNewName.trim();
    const newNormalized = normalizeCategoryName(newName);
    const category = await prisma_1.prisma.category.findUnique({ where: { id } });
    if (!category)
        throw (0, errors_1.notFound)('دسته‌بندی پیدا نشد');
    if (newNormalized !== category.nameNormalized) {
        const collision = await prisma_1.prisma.category.findUnique({
            where: { nameNormalized: newNormalized },
        });
        if (collision) {
            throw (0, errors_1.conflict)('دسته‌بندیِ دیگه‌ای همین اسم رو داره');
        }
    }
    const oldName = category.name;
    const [updated] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.category.update({
            where: { id },
            data: { name: newName, nameNormalized: newNormalized },
        }),
        prisma_1.prisma.group.updateMany({
            where: { category: oldName },
            data: { category: newName },
        }),
        prisma_1.prisma.exam.updateMany({
            where: { category: oldName },
            data: { category: newName },
        }),
        prisma_1.prisma.lessonSession.updateMany({
            where: { category: oldName },
            data: { category: newName },
        }),
        prisma_1.prisma.questionBank.updateMany({
            where: { category: oldName },
            data: { category: newName },
        }),
        prisma_1.prisma.handout.updateMany({
            where: { category: oldName },
            data: { category: newName },
        }),
    ]);
    return serializeCategory(updated);
}
