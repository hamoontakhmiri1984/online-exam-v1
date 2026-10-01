-- server/prisma/recovery/00_diagnose_readonly.sql
--
-- فقط خواندنی (read-only): هیچ تغییری روی داده، schema یا جدول _prisma_migrations نمی‌دهد.
-- اجرا (از پوشه‌ی server، با DATABASE_URL خودتان؛ نیازی به دادن آن به کسی نیست):
--   psql "$DATABASE_URL" -X -f prisma/recovery/00_diagnose_readonly.sql
--
-- SET زیر کل session را read-only می‌کند؛ هر دستور نوشتنی با خطا رد می‌شود.
SET default_transaction_read_only = on;

\echo
\echo '=== 1) آیا جدول تاریخچه‌ی Prisma وجود دارد؟ (اگر false است: DB با Prisma Migrate ساخته نشده)'
SELECT to_regclass('_prisma_migrations') IS NOT NULL AS has_prisma_history_table;

\echo
\echo '=== 2) تاریخچه‌ی چهار migration مربوط (checksum کامل را با sha256sum فایل مقایسه کنید)'
\echo '    اجراشده موفق: finished_at دارد و rolled_back_at خالی است'
\echo '    شکست‌خورده:   finished_at خالی و rolled_back_at خالی است'
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count
FROM _prisma_migrations
WHERE migration_name IN (
  '20260912133000_exam_attempt_server_timing',
  '20260912175323_add_approval_status',
  '20260914191557_add_exam_attempt_unique_constraint',
  '20260922100000_fix_exam_attempt_timing_migration_history'
)
ORDER BY migration_name;

\echo
\echo '=== 3) هر migration شکست‌خورده‌ی دیگر (در کل پروژه) + ابتدای متن خطا'
SELECT migration_name, started_at, left(logs, 400) AS error_log_head
FROM _prisma_migrations
WHERE finished_at IS NULL AND rolled_back_at IS NULL
ORDER BY started_at;

\echo
\echo '=== 4) وضعیت واقعی ساختار exam_attempts'
\echo '    S_FINAL      = expiresAt الزامی، finishedAt nullable، ایندکس یکتا موجود (مطابق schema.prisma)'
\echo '    S_REVERTED   = expiresAt نیست، finishedAt الزامی، ایندکس یکتا نیست (حالت بعد از موفقیت migration 175323)'
\echo '    S_UNEXPECTED = هر حالت دیگر: متوقف شوید و دستی بررسی کنید'
WITH cols AS (
  SELECT COALESCE(bool_or(column_name = 'expiresAt'), false)                            AS has_expires,
         COALESCE(bool_or(column_name = 'expiresAt'  AND is_nullable = 'NO'),  false)   AS expires_not_null,
         COALESCE(bool_or(column_name = 'finishedAt' AND is_nullable = 'YES'), false)   AS finished_nullable
  FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'exam_attempts'
), idx AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND tablename = 'exam_attempts'
      AND indexname = 'exam_attempts_examId_studentId_key'
  ) AS has_unique
)
SELECT CASE
         WHEN has_expires AND expires_not_null AND finished_nullable AND has_unique THEN 'S_FINAL'
         WHEN NOT has_expires AND NOT finished_nullable AND NOT has_unique           THEN 'S_REVERTED'
         ELSE 'S_UNEXPECTED'
       END AS exam_attempts_state,
       cols.*, idx.*
FROM cols, idx;

\echo
\echo '=== 5) تعداد ردیف‌ها: in_progress_attempts = تلاش‌های ناتمام (finishedAt خالی)؛ این ردیف‌ها نباید دست‌کاری شوند'
SELECT count(*) AS total_attempts,
       count(*) FILTER (WHERE "finishedAt" IS NULL) AS in_progress_attempts
FROM exam_attempts;

\echo
\echo '=== 6) ردیف‌های تکراری (examId, studentId): باید «0 rows» باشد، وگرنه ساخت ایندکس یکتا شکست می‌خورد'
SELECT "examId", "studentId", count(*) AS n
FROM exam_attempts
GROUP BY "examId", "studentId"
HAVING count(*) > 1;