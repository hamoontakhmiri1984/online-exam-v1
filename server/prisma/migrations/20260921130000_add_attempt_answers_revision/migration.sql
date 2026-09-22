-- شماره‌ی نسخه‌ی ذخیره‌ی خودکار پاسخ‌ها (جلوگیری از بازنویسی پاسخ جدید با
-- درخواست قدیمی که دیرتر می‌رسه). ردیف‌های موجود با 0 شروع می‌شن؛ اولین ذخیره‌ی
-- کلاینت با revision >= 1 همیشه پذیرفته می‌شه.

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN "answersRevision" INTEGER NOT NULL DEFAULT 0;
