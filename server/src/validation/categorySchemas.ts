import { z } from 'zod';

export const proposeCategorySchema = z.object({
  name: z.string().trim().min(1, 'نام دسته‌بندی الزامیه').max(50),
});

export const renameCategorySchema = z.object({
  name: z.string().trim().min(1, 'نام دسته‌بندی الزامیه').max(50),
});
