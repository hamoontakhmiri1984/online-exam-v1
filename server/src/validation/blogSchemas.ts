import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createBlogPostSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'اسلاگ الزامیه')
    .max(200)
    .regex(
      slugPattern,
      'اسلاگ فقط می‌تونه شامل حروف/عدد انگلیسی کوچک و خط تیره باشه'
    ),
  title: z.string().trim().min(1, 'عنوان الزامیه').max(200),
  excerpt: z.string().trim().min(1, 'خلاصه الزامیه').max(500),
  contentMarkdown: z.string().trim().min(1, 'محتوا الزامیه'),
  published: z.boolean().optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();
