import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(1),
  // حداقل یک گروه: آزمونِ بدون گروه از دید مدرس نامرئی می‌شه (دسترسی مدرس
  // از روی گروه‌هاش سنجیده می‌شه) و تو سهمیه‌ی activeExams هم شمرده نمی‌شه
  groupIds: z
    .array(z.string())
    .min(1, 'حداقل یک گروه رو برای آزمون انتخاب کن')
    .default([]),
  // ISO date string - سمت فرانت به Date تبدیل می‌شه
  scheduledAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاریخ آزمون نامعتبر است'),
  durationMinutes: z.number().int().positive(),
  allowReview: z.boolean().default(true),
});

export const updateExamSchema = createExamSchema;
