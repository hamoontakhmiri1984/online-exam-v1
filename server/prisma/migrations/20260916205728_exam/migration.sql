-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('Draft', 'Published');

-- AlterTable
-- همون الگوی migration قبلی (add_onboarding_fields): اول ستون رو با
-- default='Published' اضافه می‌کنیم تا آزمون‌های از‌قبل‌موجود (که همیشه
-- بلافاصله برای دانشجو قابل‌مشاهده بودن) یهو Draft/مخفی نشن؛ بعد default
-- رو برای رکوردهای جدید به 'Draft' تغییر می‌دیم - یعنی فقط آزمون‌هایی که
-- از این به بعد از POST /exams ساخته می‌شن Draft شروع می‌شن (که همین رو
-- هم سرور صریح ست می‌کنه، این فقط یه fallback هماهنگ با schema.prisma ـه)
ALTER TABLE "exams" ADD COLUMN "status" "ExamStatus" NOT NULL DEFAULT 'Published';

ALTER TABLE "exams" ALTER COLUMN "status" SET DEFAULT 'Draft';