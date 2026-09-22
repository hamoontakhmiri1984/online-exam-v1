import { prisma } from './prisma';
import { deleteObject } from './storage';

// فایل‌های یتیم (بعد از حذف/ویرایش جلسه یا پیوست) رو از bucket پاک می‌کنه.
// فقط کلیدهایی پاک می‌شن که دیگه هیچ رکوردی (ویدیوی جلسه، پیوست جلسه، جزوه)
// بهشون اشاره نمی‌کنه؛ خطا هم جلوی پاسخ اصلی رو نمی‌گیره (best-effort)
export async function deleteUnreferencedObjects(
  keys: Array<string | null | undefined>
): Promise<void> {
  const unique = [...new Set(keys.filter((k): k is string => Boolean(k)))];

  for (const key of unique) {
    try {
      const [sessions, attachments, handouts] = await Promise.all([
        prisma.lessonSession.count({ where: { videoObjectUrl: key } }),
        prisma.lessonAttachment.count({ where: { fileUrl: key } }),
        prisma.handout.count({ where: { fileUrl: key } }),
      ]);
      if (sessions + attachments + handouts > 0) continue;
      await deleteObject(key);
    } catch (err) {
      console.error('deleteUnreferencedObjects failed:', key, err);
    }
  }
}
