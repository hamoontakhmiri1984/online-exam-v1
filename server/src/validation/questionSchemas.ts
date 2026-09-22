import { z } from 'zod';

export const createQuestionSchema = z
  .object({
    text: z.string().min(2).max(5000),
    options: z.array(z.string().min(1).max(1000)).min(2).max(10),
    correctOptionIndex: z.number().int().min(0),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
  })
  .refine((data) => data.correctOptionIndex < data.options.length, {
    message: 'correctOptionIndex باید به یکی از گزینه‌ها اشاره کنه',
    path: ['correctOptionIndex'],
  });

export const updateQuestionSchema = createQuestionSchema;

export const bulkQuestionsSchema = z
  .array(createQuestionSchema)
  .min(1)
  .max(500);

export const addBankQuestionsToExamSchema = z.object({
  questionIds: z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'سوال تکراری در انتخاب وجود دارد',
    }),
});
