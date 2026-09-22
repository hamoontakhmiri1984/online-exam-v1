-- exam_attempts.finishedAt از این به بعد nullable ـه: null یعنی attempt
-- هنوز در حال انجامه (شروع شده ولی تموم نشده). expiresAt جدید همون لحظه‌ی
-- شروع + مدت آزمونه که سرور موقع شروع attempt محاسبه و ذخیره می‌کنه، تا
-- موقع پایان دادن نیازی به دوباره خوندن durationMinutes از Exam نباشه و
-- اگه مدت آزمون بعداً عوض بشه، رو attempt‌های در حال انجام اثر نذاره.
--
-- ردیف‌های موجود (اگه باشن) همیشه finishedAt واقعی دارن، پس برای پر کردن
-- ستون جدید expiresAt از همون finishedAt موجود استفاده می‌کنیم (یه fallback
-- منطقی برای داده‌ی قدیمی، نه یه مقدار دلخواه).

-- AlterTable
ALTER TABLE "exam_attempts" ALTER COLUMN "finishedAt" DROP NOT NULL;
ALTER TABLE "exam_attempts" ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "exam_attempts" SET "expiresAt" = "finishedAt" WHERE "expiresAt" IS NULL;

ALTER TABLE "exam_attempts" ALTER COLUMN "expiresAt" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON "exam_attempts"("examId", "studentId");
