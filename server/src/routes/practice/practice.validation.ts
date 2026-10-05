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
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  progress: z.enum(['all', 'unanswered', 'mistakes']).default('all'),
});
