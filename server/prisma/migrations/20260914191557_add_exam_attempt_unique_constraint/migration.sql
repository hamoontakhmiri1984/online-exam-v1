/*
  Warnings:

  - A unique constraint covering the columns `[examId,studentId]` on the table `exam_attempts` will be added. If there are existing duplicate values, this will fail.
*/

-- نسخهٔ اصلاح‌شده: نسخهٔ قبلی ستون expiresAt را مستقیم با NOT NULL و بدون default
-- اضافه می‌کرد و روی جدول exam_attempts دارای داده شکست می‌خورد؛ در نتیجه migration
-- اصلاحی 20260922100000 هرگز اجرا نمی‌شد. حالا همین مرحله روی جدول خالی و پر کار می‌کند.
-- حالت نهایی schema با نسخهٔ قبلی روی جدول خالی دقیقاً یکسان است.

-- AlterTable: اول nullable اضافه می‌شود تا ردیف‌های موجود قابل backfill باشند
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "exam_attempts" ALTER COLUMN "finishedAt" DROP NOT NULL;

-- backfill از finishedAt (همان fallback منطقی migration 20260912133000)
UPDATE "exam_attempts" SET "expiresAt" = "finishedAt" WHERE "expiresAt" IS NULL AND "finishedAt" IS NOT NULL;

-- اگر ردیفی هنوز expiresAt ندارد، با پیام واضح متوقف شو (به‌جای مقدار دلخواه)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "exam_attempts" WHERE "expiresAt" IS NULL) THEN
    RAISE EXCEPTION 'exam_attempts has rows with NULL expiresAt that could not be backfilled from finishedAt - resolve manually before re-running this migration';
  END IF;
END $$;

ALTER TABLE "exam_attempts" ALTER COLUMN "expiresAt" SET NOT NULL;

-- قبل از ساخت ایندکس یکتا، ردیف‌های تکراری را با پیام واضح گزارش کن
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "exam_attempts" GROUP BY "examId", "studentId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'exam_attempts has duplicate (examId, studentId) rows - remove duplicates manually before re-running this migration';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "exam_attempts_examId_studentId_key" ON "exam_attempts"("examId", "studentId");