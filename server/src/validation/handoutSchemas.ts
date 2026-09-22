import { z } from 'zod';
import { objectKeySchema } from '../lib/objectKeys';

// groupId اختیاریه: اگه بیاد یعنی جزوه فقط برای همون گروه؛ اگه نیاد (یا
// null باشه) یعنی جزوه برای کل دسته‌بندی (category) ـه - هر دانشجویی که تو
// یکی از گروه‌های همون دسته عضوه می‌بینتش. فایل رو جدا از این فرم، از
// POST /uploads/attachment آپلود می‌کنیم؛ اینجا فقط نتیجه‌ش (fileName/
// objectKey/fileSize) رو می‌گیریم - دقیقاً هم‌الگوی attachmentSchema تو
// lessonSchemas.ts
export const createHandoutSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.string().min(1),
  groupId: z.string().min(1).nullable().optional(),
  fileName: z.string().min(1),
  objectKey: objectKeySchema('lesson-attachments'),
  fileSize: z.number().int().nonnegative(),
});

// موقع ویرایش، جایگزین‌کردن فایل اختیاریه - اگه fileName/objectKey/fileSize
// نیان یعنی فایل قبلی دست‌نخورده می‌مونه. ولی اگه یکی‌شون بیاد، هر سه باید
// بیان - وگرنه ممکنه مثلاً fileUrl عوض بشه ولی fileName قدیمی رو نگه داره
// (متادیتای فایل ناسازگار تو دیتابیس بمونه)
export const updateHandoutSchema = z
  .object({
    title: z.string().min(2),
    description: z.string().optional(),
    category: z.string().min(1),
    groupId: z.string().min(1).nullable().optional(),
    fileName: z.string().min(1).optional(),
    objectKey: objectKeySchema('lesson-attachments').optional(),
    fileSize: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) => {
      const fileFields = [data.fileName, data.objectKey, data.fileSize];
      const providedCount = fileFields.filter((f) => f !== undefined).length;
      return providedCount === 0 || providedCount === 3;
    },
    {
      message:
        'برای جایگزینی فایل باید هر سه‌ی fileName/objectKey/fileSize با هم ارسال بشن',
      path: ['objectKey'],
    }
  );
