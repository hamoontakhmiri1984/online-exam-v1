import { z } from 'zod';

export const createQuestionBankSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
});

export const updateQuestionBankSchema = createQuestionBankSchema;
