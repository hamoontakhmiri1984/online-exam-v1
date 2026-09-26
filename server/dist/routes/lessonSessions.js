"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const lessonSchemas_1 = require("../validation/lessonSchemas");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const storage_1 = require("../lib/storage");
const objectKeys_1 = require("../lib/objectKeys");
const objectCleanup_1 = require("../lib/objectCleanup");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// شکل خروجی رو معادل LessonSession تو client/src/api/lessonApi.ts می‌سازیم:
// چهار فیلد پراکنده‌ی video* تو دیتابیس رو به یونیون video: {type:'link'|'upload', ...} تبدیل می‌کنیم.
// توجه: ستون‌های videoObjectUrl/fileUrl تو دیتابیس همون اسم قدیمی رو دارن
// (برای این‌که migration لازم نشه)، ولی از این به بعد فقط object key
// (نه یه URL دائمی قابل‌دسترس) توشون ذخیره می‌شه - برای همین تو JSON خروجی
// اسمش رو به objectKey تغییر می‌دیم تا فرانت اشتباه مستقیم به‌عنوان src/href
// استفاده‌ش نکنه؛ به‌جاش باید signed-url بگیره.
function serializeSession(s) {
    const video = s.videoType === 'LINK'
        ? { type: 'link', url: s.videoUrl ?? '' }
        : {
            type: 'upload',
            fileName: s.videoFileName ?? '',
            objectKey: s.videoObjectUrl ?? '',
        };
    return {
        id: s.id,
        category: s.category,
        groupIds: s.groups.map((g) => g.id),
        title: s.title,
        description: s.description,
        video,
        attachments: s.attachments.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            objectKey: a.fileUrl,
            fileSize: a.fileSize,
        })),
    };
}
const withGroups = {
    groups: { select: { id: true } },
    attachments: {
        select: { id: true, fileName: true, fileUrl: true, fileSize: true },
        // بدون orderBy ترتیب پیوست‌ها تضمین‌شده نیست و بعد از هر ویرایش ممکنه
        // جابه‌جا بشه
        orderBy: { createdAt: 'asc' },
    },
};
// بدون orderBy، Postgres ترتیب رو تضمین نمی‌کنه (و بعد از UPDATE معمولاً
// عوض می‌شه)؛ چون فرانت جلسات رو با شماره‌ی ترتیب نشون می‌ده («جلسه ۱، ۲، …»)،
// با ویرایش یه جلسه شماره‌ها جابه‌جا می‌شدن
const sessionOrder = { createdAt: 'asc' };
// عکس serializeSession: یونیون video رو به چهار فیلد پراکنده‌ی دیتابیس برمی‌گردونه
function videoToDbFields(video) {
    return video.type === 'link'
        ? {
            videoType: 'LINK',
            videoUrl: video.url,
            videoFileName: null,
            videoObjectUrl: null,
        }
        : {
            videoType: 'UPLOAD',
            videoUrl: null,
            videoFileName: video.fileName,
            videoObjectUrl: video.objectKey,
        };
}
// جلوی ثبت کلید فایلِ مال یه کاربر دیگه رو می‌گیره: Instructor فقط کلیدهایی رو
// می‌تونه بذاره که خودش آپلود کرده یا از قبل روی همین جلسه بوده (existing).
// SuperAdmin معاف از چک مالکیته (شکل کلید تو schema چک شده).
function assertFileKeysAllowed(user, data, existing) {
    if (user.role === 'SuperAdmin')
        return;
    const videoOk = data.video.type !== 'upload' ||
        (0, objectKeys_1.canUseObjectKeys)('lesson-videos', user.sub, [data.video.objectKey], existing?.videoObjectUrl ? [existing.videoObjectUrl] : []);
    const attachmentsOk = (0, objectKeys_1.canUseObjectKeys)('lesson-attachments', user.sub, data.attachments.map((a) => a.objectKey), existing?.attachments.map((a) => a.fileUrl) ?? []);
    if (!videoOk || !attachmentsOk) {
        throw (0, errors_1.forbidden)('فایل انتخاب‌شده متعلق به تو نیست');
    }
}
// SuperAdmin چک مالکیت گروه نداره، پس وجود گروه‌ها رو جدا چک می‌کنیم -
// وگرنه connect روی groupId ناموجود یه 500 (P2025) می‌داد
async function assertGroupsExist(groupIds) {
    const unique = new Set(groupIds);
    if (unique.size === 0)
        return;
    const found = await prisma_1.prisma.group.count({
        where: { id: { in: [...unique] } },
    });
    if (found !== unique.size)
        throw (0, errors_1.badRequest)('گروه یافت نشد');
}
// گروه‌هایی که این کاربر (بسته به نقشش) بهشون دسترسی داره - برای چک اینکه
// groupIds ارسالی تو بدنه‌ی درخواست، همه واقعاً متعلق به خودشن
async function ownedGroupIds(userId) {
    const groups = await prisma_1.prisma.group.findMany({
        where: { instructorId: userId },
        select: { id: true },
    });
    return new Set(groups.map((g) => g.id));
}
// معادل loadAccessibleExam تو lib/examAccess.ts، برای LessonSession: فقط
// برای دو endpoint امضای لینک (پایین همین فایل) لازمه، چون اونجا برخلاف
// GET '/' که فقط فیلتر می‌کنه، باید صریح allowed/not-allowed بدونیم.
// SuperAdmin: همیشه مجاز. Instructor: اگه حداقل یکی از گروه‌های جلسه مال
// خودش باشه. Student: فقط اگه عضو حداقل یکی از گروه‌های جلسه باشه.
async function loadAccessibleSession(sessionId, userId, role) {
    const session = await prisma_1.prisma.lessonSession.findUnique({
        where: { id: sessionId },
        include: withGroups,
    });
    if (!session)
        return { session: null, allowed: false };
    if (role === 'SuperAdmin')
        return { session, allowed: true };
    const groupIds = session.groups.map((g) => g.id);
    if (role === 'Instructor') {
        const owned = await prisma_1.prisma.group.count({
            where: { id: { in: groupIds }, instructorId: userId },
        });
        return { session, allowed: owned > 0 };
    }
    const isMember = await prisma_1.prisma.group.count({
        where: { id: { in: groupIds }, students: { some: { id: userId } } },
    });
    return { session, allowed: isMember > 0 };
}
// لیست جلسات - اگه ?groupId بیاد فقط جلسات همون گروه، وگرنه همه‌ی جلساتی
// که کاربر بهشون دسترسی داره (SuperAdmin: همه، Instructor: جلسات گروه‌های
// خودش، Student: جلسات گروه‌هایی که عضوشونه)
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
    if (groupId) {
        // باگ: اینجا از withGroups استفاده شده بود که include: { groups: ... }ـه
        // - ولی این یه include روی مدل Group ـه، نه LessonSession! مدل Group
        // اصلاً فیلد/رابطه‌ای به اسم "groups" نداره (خودش "groups" هست، نه
        // چیزی که "groups" داشته باشه)، برای همین Prisma این کوئری رو رد
        // می‌کرد و 500 برمی‌گردوند - دقیقاً همون خطایی که موقع باز کردن
        // لیست جلسات یه گروه می‌گرفتی. اینجا فقط به group.instructorId نیاز
        // داریم، پس اصلاً include لازم نیست.
        const group = await prisma_1.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group)
            throw (0, errors_1.notFound)('گروه یافت نشد');
        const isOwner = role === 'Instructor' && group.instructorId === sub;
        const isMember = role === 'Student' &&
            (await prisma_1.prisma.group.count({
                where: { id: groupId, students: { some: { id: sub } } },
            })) > 0;
        if (role !== 'SuperAdmin' && !isOwner && !isMember) {
            throw (0, errors_1.forbidden)();
        }
        const sessions = await prisma_1.prisma.lessonSession.findMany({
            where: { groups: { some: { id: groupId } } },
            include: withGroups,
            orderBy: sessionOrder,
        });
        return res.json(sessions.map(serializeSession));
    }
    const where = role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
            ? { groups: { some: { instructorId: sub } } }
            : { groups: { some: { students: { some: { id: sub } } } } };
    const sessions = await prisma_1.prisma.lessonSession.findMany({
        where,
        include: withGroups,
        orderBy: sessionOrder,
    });
    res.json(sessions.map(serializeSession));
}));
// فقط Instructor/SuperAdmin جلسه می‌سازن. برای Instructor حداقل یه گروه
// اجباریه و باید همه‌ش گروه‌های خودش باشن - جلسه‌ی کاملاً بدون‌گروه (content
// library آزاد) فعلاً فقط از SuperAdmin پذیرفته می‌شه
router.post('/', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = lessonSchemas_1.createSessionSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    if (req.user.role === 'Instructor') {
        if (parsed.data.groupIds.length === 0) {
            throw (0, errors_1.badRequest)('حداقل باید یه گروه انتخاب کنی');
        }
        const owned = await ownedGroupIds(req.user.sub);
        if (parsed.data.groupIds.some((id) => !owned.has(id))) {
            throw (0, errors_1.forbidden)('فقط می‌تونی جلسه رو به گروه‌های خودت وصل کنی');
        }
    }
    if (req.user.role === 'SuperAdmin') {
        await assertGroupsExist(parsed.data.groupIds);
    }
    assertFileKeysAllowed(req.user, parsed.data);
    const session = await prisma_1.prisma.lessonSession.create({
        data: {
            category: parsed.data.category,
            title: parsed.data.title,
            description: parsed.data.description,
            ...videoToDbFields(parsed.data.video),
            groups: { connect: parsed.data.groupIds.map((id) => ({ id })) },
            attachments: {
                create: parsed.data.attachments.map((a) => ({
                    fileName: a.fileName,
                    fileUrl: a.objectKey,
                    fileSize: a.fileSize,
                })),
            },
        },
        include: withGroups,
    });
    res.status(201).json(serializeSession(session));
}));
router.put('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.lessonSession.findUnique({
        where: { id: req.params.id },
        include: withGroups,
    });
    if (!existing)
        throw (0, errors_1.notFound)('جلسه یافت نشد');
    if (req.user.role === 'Instructor') {
        const owned = await ownedGroupIds(req.user.sub);
        const belongsToInstructor = existing.groups.some((g) => owned.has(g.id));
        if (!belongsToInstructor)
            throw (0, errors_1.forbidden)();
    }
    const parsed = lessonSchemas_1.updateSessionSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    if (req.user.role === 'Instructor') {
        if (parsed.data.groupIds.length === 0) {
            throw (0, errors_1.badRequest)('حداقل باید یه گروه انتخاب کنی');
        }
        const owned = await ownedGroupIds(req.user.sub);
        if (parsed.data.groupIds.some((id) => !owned.has(id))) {
            throw (0, errors_1.forbidden)('فقط می‌تونی جلسه رو به گروه‌های خودت وصل کنی');
        }
    }
    if (req.user.role === 'SuperAdmin') {
        await assertGroupsExist(parsed.data.groupIds);
    }
    assertFileKeysAllowed(req.user, parsed.data, existing);
    const session = await prisma_1.prisma.lessonSession.update({
        where: { id: req.params.id },
        data: {
            category: parsed.data.category,
            title: parsed.data.title,
            description: parsed.data.description,
            ...videoToDbFields(parsed.data.video),
            groups: { set: parsed.data.groupIds.map((id) => ({ id })) },
            // لیست پیوست‌ها رو کامل جایگزین می‌کنیم به‌جای diff زدن؛ چون فایل‌ها
            // sessionId خودشون رو ندارن که بخوایم با matching نگه‌داریم، پاک
            // کردن همه و ساختن دوباره از روی لیست ارسالی ساده‌تر و کافیه
            attachments: {
                deleteMany: {},
                create: parsed.data.attachments.map((a) => ({
                    fileName: a.fileName,
                    fileUrl: a.objectKey,
                    fileSize: a.fileSize,
                })),
            },
        },
        include: withGroups,
    });
    // فایل‌هایی که با این ویرایش از جلسه کنار رفتن (ویدیوی قبلی/پیوست حذف‌شده)
    await (0, objectCleanup_1.deleteUnreferencedObjects)([
        existing.videoObjectUrl,
        ...existing.attachments.map((a) => a.fileUrl),
    ]);
    res.json(serializeSession(session));
}));
// ویدیوی آپلودی دیگه با یه URL دائمی سرو نمی‌شه (اون تو bucket خصوصیه) -
// هر بار که فرانت واقعاً بخواد پخشش کنه، بعد از چک همون دسترسیِ
// loadAccessibleSession، یه لینک موقت (چند دقیقه‌ای) می‌گیره. اگه جلسه از
// نوع لینک (یوتیوب/آپارات) باشه، اصلاً چیزی برای امضا کردن نیست.
router.get('/:id/video/signed-url', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const { session, allowed } = await loadAccessibleSession(req.params.id, sub, role);
    if (!session)
        throw (0, errors_1.notFound)('جلسه یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    if (session.videoType !== 'UPLOAD' || !session.videoObjectUrl) {
        throw (0, errors_1.badRequest)('این جلسه ویدیوی آپلودی نداره');
    }
    const url = await (0, storage_1.getSignedDownloadUrl)(session.videoObjectUrl);
    res.json({ url });
}));
// همون منطق، برای دانلود جزوه/PDF یه پیوست - دسترسی از روی جلسه‌ای که
// پیوست بهش وصله چک می‌شه (خود پیوست گروه/مالک نداره)
router.get('/attachments/:attachmentId/signed-url', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const attachment = await prisma_1.prisma.lessonAttachment.findUnique({
        where: { id: req.params.attachmentId },
    });
    if (!attachment)
        throw (0, errors_1.notFound)('فایل یافت نشد');
    const { session, allowed } = await loadAccessibleSession(attachment.sessionId, sub, role);
    if (!session)
        throw (0, errors_1.notFound)('جلسه یافت نشد');
    if (!allowed)
        throw (0, errors_1.forbidden)();
    const url = await (0, storage_1.getSignedDownloadUrl)(attachment.fileUrl);
    res.json({ url });
}));
router.delete('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.lessonSession.findUnique({
        where: { id: req.params.id },
        include: withGroups,
    });
    if (!existing)
        throw (0, errors_1.notFound)('جلسه یافت نشد');
    if (req.user.role === 'Instructor') {
        const owned = await ownedGroupIds(req.user.sub);
        const belongsToInstructor = existing.groups.some((g) => owned.has(g.id));
        if (!belongsToInstructor)
            throw (0, errors_1.forbidden)();
    }
    await prisma_1.prisma.lessonSession.delete({ where: { id: req.params.id } });
    await (0, objectCleanup_1.deleteUnreferencedObjects)([
        existing.videoObjectUrl,
        ...existing.attachments.map((a) => a.fileUrl),
    ]);
    res.status(204).end();
}));
exports.default = router;
