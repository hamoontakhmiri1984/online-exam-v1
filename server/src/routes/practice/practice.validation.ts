import { z } from 'zod';
const ids = (max: number, min = 0) =>
  z
    .array(z.string().min(1).max(100))
    .min(min)
    .max(max)
    .refine(
      (values) => new Set(values).size === values.length,
      'شناسه تکراری مجاز نیست',
    );
export const createPracticeSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).default(''),
    groupIds: ids(100),
    questionIds: ids(100, 1),
  })
  .strict();
export const updatePracticeSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).default(''),
    groupIds: ids(100),
    questionIds: ids(100, 1).optional(),
  })
  .strict();
export const practiceDifficulties = ['Easy', 'Medium', 'Hard'] as const;
const sampleCount = z.number().int().min(0).max(100);
export const randomPracticeQuestionsSchema = z.object({
  bankIds: ids(100, 1),
  counts: z.object({ Easy: sampleCount, Medium: sampleCount, Hard: sampleCount }).strict(),
  excludeQuestionIds: ids(100).default([]),
}).strict().refine(({ counts, excludeQuestionIds }) => {
  const total = practiceDifficulties.reduce((sum, level) => sum + counts[level], 0);
  return total > 0 && total + excludeQuestionIds.length <= 100;
}, 'مجموع سؤال‌های انتخاب‌شده و تصادفی باید بین ۱ و ۱۰۰ باشد.');
export const answerSchema = z
  .object({
    requestId: z.string().uuid(),
    selectedOptionIndex: z.number().int().min(0).max(9),
  })
  .strict();
export const statusSchema = z
  .object({ status: z.enum(['Published', 'Archived']) })
  .strict();
export const questionFilterSchema = z.object({
  difficulty: z.enum(practiceDifficulties).optional(),
  progress: z.enum(['all', 'unanswered', 'mistakes']).default('all'),
});
