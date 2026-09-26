"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnreferencedObjects = deleteUnreferencedObjects;
const prisma_1 = require("./prisma");
const storage_1 = require("./storage");
// فایل‌های یتیم (بعد از حذف/ویرایش جلسه یا پیوست) رو از bucket پاک می‌کنه.
// فقط کلیدهایی پاک می‌شن که دیگه هیچ رکوردی (ویدیوی جلسه، پیوست جلسه، جزوه)
// بهشون اشاره نمی‌کنه؛ خطا هم جلوی پاسخ اصلی رو نمی‌گیره (best-effort)
async function deleteUnreferencedObjects(keys) {
    const unique = [...new Set(keys.filter((k) => Boolean(k)))];
    for (const key of unique) {
        try {
            const [sessions, attachments, handouts] = await Promise.all([
                prisma_1.prisma.lessonSession.count({ where: { videoObjectUrl: key } }),
                prisma_1.prisma.lessonAttachment.count({ where: { fileUrl: key } }),
                prisma_1.prisma.handout.count({ where: { fileUrl: key } }),
            ]);
            if (sessions + attachments + handouts > 0)
                continue;
            await (0, storage_1.deleteObject)(key);
        }
        catch (err) {
            console.error('deleteUnreferencedObjects failed:', key, err);
        }
    }
}
