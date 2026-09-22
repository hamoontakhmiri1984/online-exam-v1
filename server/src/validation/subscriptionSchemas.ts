import { z } from 'zod';

const planIdSchema = z.enum(['free', 'gold', 'platinum', 'vip']);

export const selectPlanSchema = z.object({
  planId: planIdSchema,
});

// همون planId رو می‌خواد - amount رو کلاینت نمی‌فرسته، سرور خودش از
// server/src/lib/plans.ts می‌خونه (تا کسی نتونه amount رو دستکاری کنه)
export const checkoutSchema = z.object({
  planId: planIdSchema,
});

export const assignPlanSchema = z.object({
  instructorId: z.string().min(1),
  planId: planIdSchema,
});
