import { z } from 'zod';
import { objectKeySchema } from '../lib/objectKeys';

// دقیقاً معادل VideoSource تو client/src/api/lessonApi.ts - objectKey همون
// چیزیه که POST /uploads/video برمی‌گردونه (نه یه URL قابل‌دسترس مستقیم)
// فقط لینک http/https پذیرفته می‌شه (جلوی javascript:/data: و ...). لینک بدون
// scheme (مثل aparat.com/v/xxx که فرانت باهاش کار می‌کنه) با https:// کامل می‌شه.
export const videoLinkSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .transform((value) =>
    /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`
  )
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        (u.protocol === 'https:' || u.protocol === 'http:') &&
        u.hostname.includes('.') &&
        !u.username &&
        !u.password
      );
    } catch {
      return false;
    }
  }, 'لینک ویدیو نامعتبر است');

export const videoSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('link'), url: videoLinkSchema }),
  z.object({
    type: z.literal('upload'),
    fileName: z.string().min(1),
    objectKey: objectKeySchema('lesson-videos'),
  }),
]);

// جزوه/PDF - id اختیاریه چون موقع ساخت یه پیوست جدید (که هنوز تو دیتابیس
// ردیف نداره) فقط از سرور آپلود، fileName/objectKey/fileSize میاد؛ id فقط
// وقتی یه جلسه‌ی موجود رو serialize می‌کنیم برمی‌گرده (برای React key)
export const attachmentSchema = z.object({
  id: z.string().optional(),
  fileName: z.string().min(1),
  objectKey: objectKeySchema('lesson-attachments'),
  fileSize: z.number().int().nonnegative(),
});

export const createSessionSchema = z.object({
  category: z.string().min(1),
  groupIds: z.array(z.string()).default([]),
  title: z.string().min(2),
  // فرم کلاینت توضیحات رو اجباری نمی‌کنه (فقط عنوان و ویدیو)؛ قبلاً اینجا
  // min(1) بود و ثبتِ جلسه‌ی بدون توضیح با 400 رد می‌شد
  description: z.string().trim().default(''),
  video: videoSourceSchema,
  attachments: z.array(attachmentSchema).default([]),
});

export const updateSessionSchema = createSessionSchema;
