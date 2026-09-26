"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSessionSchema = exports.createSessionSchema = exports.attachmentSchema = exports.videoSourceSchema = exports.videoLinkSchema = void 0;
const zod_1 = require("zod");
const objectKeys_1 = require("../lib/objectKeys");
// دقیقاً معادل VideoSource تو client/src/api/lessonApi.ts - objectKey همون
// چیزیه که POST /uploads/video برمی‌گردونه (نه یه URL قابل‌دسترس مستقیم)
// فقط لینک http/https پذیرفته می‌شه (جلوی javascript:/data: و ...). لینک بدون
// scheme (مثل aparat.com/v/xxx که فرانت باهاش کار می‌کنه) با https:// کامل می‌شه.
exports.videoLinkSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .transform((value) => /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`)
    .refine((value) => {
    try {
        const u = new URL(value);
        return ((u.protocol === 'https:' || u.protocol === 'http:') &&
            u.hostname.includes('.') &&
            !u.username &&
            !u.password);
    }
    catch {
        return false;
    }
}, 'لینک ویدیو نامعتبر است');
exports.videoSourceSchema = zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({ type: zod_1.z.literal('link'), url: exports.videoLinkSchema }),
    zod_1.z.object({
        type: zod_1.z.literal('upload'),
        fileName: zod_1.z.string().min(1),
        objectKey: (0, objectKeys_1.objectKeySchema)('lesson-videos'),
    }),
]);
// جزوه/PDF - id اختیاریه چون موقع ساخت یه پیوست جدید (که هنوز تو دیتابیس
// ردیف نداره) فقط از سرور آپلود، fileName/objectKey/fileSize میاد؛ id فقط
// وقتی یه جلسه‌ی موجود رو serialize می‌کنیم برمی‌گرده (برای React key)
exports.attachmentSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    fileName: zod_1.z.string().min(1),
    objectKey: (0, objectKeys_1.objectKeySchema)('lesson-attachments'),
    fileSize: zod_1.z.number().int().nonnegative(),
});
exports.createSessionSchema = zod_1.z.object({
    category: zod_1.z.string().min(1),
    groupIds: zod_1.z.array(zod_1.z.string()).default([]),
    title: zod_1.z.string().min(2),
    // فرم کلاینت توضیحات رو اجباری نمی‌کنه (فقط عنوان و ویدیو)؛ قبلاً اینجا
    // min(1) بود و ثبتِ جلسه‌ی بدون توضیح با 400 رد می‌شد
    description: zod_1.z.string().trim().default(''),
    video: exports.videoSourceSchema,
    attachments: zod_1.z.array(exports.attachmentSchema).default([]),
});
exports.updateSessionSchema = exports.createSessionSchema;
