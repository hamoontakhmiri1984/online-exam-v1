import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(1),
  groupIds: z
    .array(z.string())
    .min(1, 'حداقل یک گروه رو برای آزمون انتخاب کن')
    .default([]),
  scheduledAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاریخ آزمون نامعتبر است'),
  durationMinutes: z.number().int().positive(),
  allowReview: z.boolean().default(true),
});

export const updateExamSchema = createExamSchema;
