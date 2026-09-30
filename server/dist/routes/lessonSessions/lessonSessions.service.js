"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionOrder = exports.withGroups = void 0;
exports.serializeSession = serializeSession;
exports.videoToDbFields = videoToDbFields;
exports.assertFileKeysAllowed = assertFileKeysAllowed;
exports.assertGroupsExist = assertGroupsExist;
exports.ownedGroupIds = ownedGroupIds;
exports.loadAccessibleSession = loadAccessibleSession;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const objectKeys_1 = require("../../lib/objectKeys");
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
exports.withGroups = {
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
exports.sessionOrder = { createdAt: 'asc' };
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
// برای دو endpoint امضای لینک (تو lessonSessions.routes.ts) لازمه، چون اونجا
// برخلاف GET '/' که فقط فیلتر می‌کنه، باید صریح allowed/not-allowed بدونیم.
// SuperAdmin: همیشه مجاز. Instructor: اگه حداقل یکی از گروه‌های جلسه مال
// خودش باشه. Student: فقط اگه عضو حداقل یکی از گروه‌های جلسه باشه.
async function loadAccessibleSession(sessionId, userId, role) {
    const session = await prisma_1.prisma.lessonSession.findUnique({
        where: { id: sessionId },
        include: exports.withGroups,
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
