"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHandoutSchema = exports.createHandoutSchema = void 0;
const zod_1 = require("zod");
const objectKeys_1 = require("../lib/objectKeys");
// groupId اختیاریه: اگه بیاد یعنی جزوه فقط برای همون گروه؛ اگه نیاد (یا
// null باشه) یعنی جزوه برای کل دسته‌بندی (category) ـه - هر دانشجویی که تو
// یکی از گروه‌های همون دسته عضوه می‌بینتش. فایل رو جدا از این فرم، از
// POST /uploads/attachment آپلود می‌کنیم؛ اینجا فقط نتیجه‌ش (fileName/
// objectKey/fileSize) رو می‌گیریم - دقیقاً هم‌الگوی attachmentSchema تو
// lessonSchemas.ts
exports.createHandoutSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().min(1),
    groupId: zod_1.z.string().min(1).nullable().optional(),
    fileName: zod_1.z.string().min(1),
    objectKey: (0, objectKeys_1.objectKeySchema)('lesson-attachments'),
    fileSize: zod_1.z.number().int().nonnegative(),
});
// موقع ویرایش، جایگزین‌کردن فایل اختیاریه - اگه fileName/objectKey/fileSize
// نیان یعنی فایل قبلی دست‌نخورده می‌مونه. ولی اگه یکی‌شون بیاد، هر سه باید
// بیان - وگرنه ممکنه مثلاً fileUrl عوض بشه ولی fileName قدیمی رو نگه داره
// (متادیتای فایل ناسازگار تو دیتابیس بمونه)
exports.updateHandoutSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().min(1),
    groupId: zod_1.z.string().min(1).nullable().optional(),
    fileName: zod_1.z.string().min(1).optional(),
    objectKey: (0, objectKeys_1.objectKeySchema)('lesson-attachments').optional(),
    fileSize: zod_1.z.number().int().nonnegative().optional(),
})
    .refine((data) => {
    const fileFields = [data.fileName, data.objectKey, data.fileSize];
    const providedCount = fileFields.filter((f) => f !== undefined).length;
    return providedCount === 0 || providedCount === 3;
}, {
    message: 'برای جایگزینی فایل باید هر سه‌ی fileName/objectKey/fileSize با هم ارسال بشن',
    path: ['objectKey'],
});
