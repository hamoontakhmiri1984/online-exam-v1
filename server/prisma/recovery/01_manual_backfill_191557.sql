-- server/prisma/recovery/01_manual_backfill_191557.sql
--
-- فقط وقتی لازم است که فایل migration 20260914191557 را به «نسخه‌ی قدیمی اجراشده» برگردانده‌اید
-- (README.fa.md، مسیر ۷-ب) و دیتابیسی با داده، روی آن نسخه‌ی قدیمی شکست خورده یا هنوز migration را اجرا نکرده است.
-- نسخه‌ی قدیمی روی جدول دارای داده شکست می‌خورد، پس اثر نهاییِ همان migration را این فایل دستی و بدون حذف داده می‌سازد.
--
-- قبل از اجرا: پشتیبان بگیرید و 00_diagnose_readonly.sql باید یکی از این‌ها را نشان دهد:
--   state = S_REVERTED  یا  S_PARTIAL_EXPIRES_NULLABLE  یا  S_PARTIAL_INDEX_MISSING
-- (نه S_UNEXPECTED و نه S_PARTIAL_EXPIRES_LOST). ردیف تکراری (examId, studentId) نباید باشد؛
-- این فایل هیچ ردیفی را حذف یا ادغام نمی‌کند و در صورت وجود تکراری با خطا متوقف می‌شود.
--
-- اجرا (از پوشه‌ی server):
--   psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -f prisma/recovery/01_manual_backfill_191557.sql
--
-- همه‌چیز در یک تراکنش است؛ هر شکستی کل تغییر را برمی‌گرداند. مقدار expiresAt فقط از finishedAt
-- (همان fallback خودِ migration) پر می‌شود و فقط برای ردیف‌هایی که expiresAt ندارند؛ مقدار موجود هرگز عوض نمی‌شود.
-- زمان پایان برای تلاش ناتمام ساخته نمی‌شود: اگر ردیفی بدون expiresAt و بدون finishedAt باشد، اجرا متوقف می‌شود.
--
-- بعد از موفقیت (به همین ترتیب):
--   1) psql ... -f prisma/recovery/00_diagnose_readonly.sql   ← باید state = S_FINAL باشد
--   2) npx prisma migrate resolve --applied 20260914191557_add_exam_attempt_unique_constraint
--   3) npx prisma migrate deploy

\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF to_regclass(format('%I.exam_attempts', current_schema())) IS NULL THEN
    RAISE EXCEPTION 'exam_attempts does not exist in schema %', current_schema();
  END IF;
END $$;

ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "exam_attempts" ALTER COLUMN "finishedAt" DROP NOT NULL;

UPDATE "exam_attempts" SET "expiresAt" = "finishedAt"
WHERE "expiresAt" IS NULL AND "finishedAt" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "exam_attempts" WHERE "expiresAt" IS NULL) THEN
    RAISE EXCEPTION 'rows with NULL expiresAt and NULL finishedAt exist: supply the real expiresAt from your own source, then re-run';
  END IF;
END $$;

ALTER TABLE "exam_attempts" ALTER COLUMN "expiresAt" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "exam_attempts" GROUP BY "examId", "studentId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'duplicate (examId, studentId) rows exist: merging them is your decision; nothing was changed';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "exam_attempts_examId_studentId_key"
  ON "exam_attempts"("examId", "studentId");

-- IF NOT EXISTS فقط نام را می‌بیند؛ مطمئن شوید ایندکس واقعاً یکتا، معتبر و روی ستون‌های درست است
DO $$
DECLARE ok boolean;
BEGIN
  SELECT COALESCE(bool_or(
           i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL
           AND i.indnkeyatts = 2
           AND ARRAY(SELECT a.attname::text
                     FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
                     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
                     ORDER BY k.ord) = ARRAY['examId', 'studentId']::text[]), false)
    INTO ok
  FROM pg_index i
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_class c  ON c.oid = i.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = current_schema() AND c.relname = 'exam_attempts'
    AND ic.relname = 'exam_attempts_examId_studentId_key';
  IF NOT ok THEN
    RAISE EXCEPTION 'index exam_attempts_examId_studentId_key exists but is not a valid unique index on (examId, studentId); nothing was changed';
  END IF;
END $$;

COMMIT;
