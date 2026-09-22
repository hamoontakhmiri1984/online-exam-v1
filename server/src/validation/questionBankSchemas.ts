import { z } from 'zod';

// category دقیقاً هم‌الگوی Group/Exam - رشته‌ی آزاد (نه enum، نه FK به
// مدل Category)، طبق همون تصمیم معماری که رو اون دوتا هم گرفته شده بود
export const createQuestionBankSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
});

export const updateQuestionBankSchema = createQuestionBankSchema;
