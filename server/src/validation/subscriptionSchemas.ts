import { z } from 'zod';

const planIdSchema = z.enum(['free', 'gold', 'platinum', 'vip']);

export const selectPlanSchema = z.object({
  planId: planIdSchema,
});

// Read payment amounts from server-side plans, never the request body.
export const checkoutSchema = z.object({
  planId: planIdSchema,
});

export const assignPlanSchema = z.object({
  instructorId: z.string().min(1),
  planId: planIdSchema,
});
