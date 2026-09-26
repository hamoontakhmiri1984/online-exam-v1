"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExamSchema = exports.createExamSchema = void 0;
const zod_1 = require("zod");
exports.createExamSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    category: zod_1.z.string().min(1),
    // حداقل یک گروه: آزمونِ بدون گروه از دید مدرس نامرئی می‌شه (دسترسی مدرس
    // از روی گروه‌هاش سنجیده می‌شه) و تو سهمیه‌ی activeExams هم شمرده نمی‌شه
    groupIds: zod_1.z
        .array(zod_1.z.string())
        .min(1, 'حداقل یک گروه رو برای آزمون انتخاب کن')
        .default([]),
    // ISO date string - سمت فرانت به Date تبدیل می‌شه
    scheduledAt: zod_1.z
        .string()
        .min(1)
        .refine((v) => !Number.isNaN(Date.parse(v)), 'تاریخ آزمون نامعتبر است'),
    durationMinutes: zod_1.z.number().int().positive(),
    allowReview: zod_1.z.boolean().default(true),
});
exports.updateExamSchema = exports.createExamSchema;
