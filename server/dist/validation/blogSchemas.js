"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBlogPostSchema = exports.createBlogPostSchema = void 0;
const zod_1 = require("zod");
// فقط حروف/عدد انگلیسی و خط تیره - چون slug مستقیم تو URL بلاگ استفاده
// می‌شه (client/blog/:slug)
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
exports.createBlogPostSchema = zod_1.z.object({
    slug: zod_1.z
        .string()
        .trim()
        .min(1, 'اسلاگ الزامیه')
        .max(200)
        .regex(slugPattern, 'اسلاگ فقط می‌تونه شامل حروف/عدد انگلیسی کوچک و خط تیره باشه'),
    title: zod_1.z.string().trim().min(1, 'عنوان الزامیه').max(200),
    excerpt: zod_1.z.string().trim().min(1, 'خلاصه الزامیه').max(500),
    contentMarkdown: zod_1.z.string().trim().min(1, 'محتوا الزامیه'),
    published: zod_1.z.boolean().optional(),
});
// موقع ویرایش همه‌ی فیلدها اختیاری‌ان (فقط چیزی که عوض شده فرستاده می‌شه)
exports.updateBlogPostSchema = exports.createBlogPostSchema.partial();
