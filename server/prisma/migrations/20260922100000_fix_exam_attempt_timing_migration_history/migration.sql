-- این migration، تاریخچه‌ی خراب migration های قبلی رو (بدون دست زدن به خودِ
-- فایل‌های قدیمی - که تغییرشون checksum رو برای هر کسی که قبلاً اجراشون
-- کرده به‌هم می‌ریزه) اصلاح می‌کنه:
--
--   20260912_133000 exam_attempt_server_timing        -> expiresAt رو اضافه کرد،
--                                                         finishedAt رو nullable کرد،
--                                                         ایندکس یکتا ساخت.
--   20260912_175323 add_approval_status (اسمش غلطه!)  -> دقیقاً همون سه تا
--                                                         تغییر بالا رو برگردوند:
--                                                         expiresAt رو DROP کرد،
--                                                         finishedAt رو دوباره
--                                                         NOT NULL کرد، ایندکس
--                                                         یکتا رو DROP کرد.
--   20260914_191557 add_exam_attempt_unique_constraint -> سعی کرد expiresAt رو
--                                                         NOT NULL بدون default
--                                                         برگردونه - رو یه
--                                                         جدولِ خالی (نصبِ تازه)
--                                                         کار می‌کنه، ولی رو هر
--                                                         محیطی که تا اون لحظه
--                                                         ردیفی تو exam_attempts
--                                                         داشته، همون‌جا fail
--                                                         می‌کنه.
--
-- این migration idempotent و مستقل از اینه که یه دیتابیسِ مشخص دقیقاً کدوم
-- زیرمجموعه از migration های بالا روش با موفقیت اجرا شده - چه از قبل به
-- وضعیتِ درست (schema.prisma فعلی) رسیده باشه (هر ۴ چک زیر no-op می‌شن)، چه
-- migration سوم روش fail کرده و تو وضعیتِ برگشته (بدون expiresAt، با
-- finishedAt اجباری) گیر کرده باشه.

-- 1) اگه expiresAt (به هر دلیلی) وجود نداره، دوباره اضافه‌ش کن - nullable،
-- چون ممکنه ردیف موجود داشته باشیم که باید backfill بشن
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_attempts' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE "exam_attempts" ADD COLUMN "expiresAt" TIMESTAMP(3);
  END IF;
END $$;

-- 2) backfill: همون fallback منطقیِ migration اصلی (finishedAt) - هر ردیفی
-- که تا الان finish شده، expiresAt‌ش رو از finishedAt خودش می‌گیره
UPDATE "exam_attempts"
SET "expiresAt" = "finishedAt"
WHERE "expiresAt" IS NULL AND "finishedAt" IS NOT NULL;

-- 3) دفاع صریح: اگه بعد از backfill بازم ردیفی بدون expiresAt مونده باشه
-- (یعنی attempt در حال انجام‌ی از قبل از این تغییرات، بدون finishedAt هم)
-- به‌جای ساختنِ یه مقدار دلخواه، migration رو با خطای واضح متوقف کن تا
-- دستی بررسی بشه - نه اینکه NOT NULL پایین‌تر با پیام مبهم Postgres fail کنه
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "exam_attempts" WHERE "expiresAt" IS NULL) THEN
    RAISE EXCEPTION 'exam_attempts has rows with NULL expiresAt that could not be backfilled from finishedAt - resolve manually before this migration can proceed';
  END IF;
END $$;

ALTER TABLE "exam_attempts" ALTER COLUMN "expiresAt" SET NOT NULL;
ALTER TABLE "exam_attempts" ALTER COLUMN "finishedAt" DROP NOT NULL;

-- 4) ایندکس یکتا رو فقط اگه وجود نداره بساز
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'exam_attempts_examId_studentId_key'
  ) THEN
    CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON "exam_attempts"("examId", "studentId");
  END IF;
END $$;
