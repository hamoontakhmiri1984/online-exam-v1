-- AlterTable
-- توجه: ستون رو اول با default=true اضافه می‌کنیم تا کاربرهای از‌قبل‌موجود
-- (که قبلاً بدون این فلو ثبت‌نام/کار کردن) یهو به Onboarding پرت نشن؛ بعد
-- default رو برای رکوردهای جدید به false تغییر می‌دیم - یعنی فقط کاربرهایی
-- که از این به بعد از /register میان، onboardingCompleted=false شروع می‌شن
ALTER TABLE "users" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "organizationName" TEXT;

ALTER TABLE "users" ALTER COLUMN "onboardingCompleted" SET DEFAULT false;
