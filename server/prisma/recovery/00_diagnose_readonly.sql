-- server/prisma/recovery/00_diagnose_readonly.sql
--
-- فقط خواندنی (read-only): هیچ تغییری روی داده، schema یا جدول _prisma_migrations نمی‌دهد.
--
-- اجرا (از پوشه‌ی server). حتماً با ON_ERROR_STOP تا شکست SQL پنهان نماند
-- (خودِ فایل هم همین را روشن می‌کند، ولی آگاهانه بنویسید):
--   psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -f prisma/recovery/00_diagnose_readonly.sql
-- PSQL_URL همان DATABASE_URL است «بدون» ?schema=... (psql پارامتر schema را نمی‌شناسد و خطا می‌دهد).
--
-- اختیاری: مقایسه‌ی checksum ثبت‌شده‌ی 191557 با فایل فعلی (README را ببینید):
--   -v file_sha191=<sha256 فایل با پایان‌خط LF> -v file_sha191_crlf=<sha256 همان محتوا با CRLF>
--
-- نیازمند: psql 10 یا بالاتر (\if و \gset)، سرور PostgreSQL 11 یا بالاتر (indnkeyatts).
-- آخرین خروجی، یک خط «SUMMARY state=... path=...» است که برای اسکریپت تست هم قابل‌خواندن است.

\set ON_ERROR_STOP on
SET default_transaction_read_only = on;

-- مقدارهای پیش‌فرض (اگر جدولی نبود، بخش مربوط اجرا نمی‌شود و این مقدارها می‌مانند)
\set has_hist f
\set has_attempts f
\set other_tables 0
\set hist_rows 0
\set applied_133 f
\set applied_175 f
\set applied_191 f
\set applied_922 f
\set failed_175 f
\set failed_191 f
\set failed_922 f
\set failed_other 0
\set failed_other_names ''
\set has_finished f
\set has_expires f
\set state S_NO_TABLE
\set diff_from_final ''
\set idx_named_exists f
\set idx_ok f
\set idx_other_unique f
\set total_attempts 0
\set in_progress 0
\set dup_groups 0
\set has_dups f
\set has_pair f
\set null_expires 0

\echo
\echo '=== 0) اتصال'
SELECT current_database() AS database, current_schema() AS schema,
       current_setting('server_version') AS server_version,
       current_setting('default_transaction_read_only') AS session_read_only;

\echo
\echo '=== 1) پیش‌نیازها: آیا جدول تاریخچه‌ی Prisma و جدول exam_attempts وجود دارند؟'
SELECT to_regclass(format('%I._prisma_migrations', current_schema())) IS NOT NULL AS has_hist,
       to_regclass(format('%I.exam_attempts', current_schema())) IS NOT NULL      AS has_attempts,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = current_schema() AND c.relkind IN ('r', 'p')
           AND c.relname <> '_prisma_migrations')                                  AS other_tables
\gset

\echo '    جدول _prisma_migrations :' :has_hist
\echo '    جدول exam_attempts      :' :has_attempts
\echo '    تعداد جدول‌های دیگر     :' :other_tables
\if :has_hist
\else
  \echo '    !!! جدول _prisma_migrations وجود ندارد: یا دیتابیس خالی است، یا بدون Prisma Migrate ساخته شده.'
  \echo '        اگر جدول‌های دیگر هست، migrate deploy را نزنید (baseline لازم است؛ خارج از این بسته).'
\endif
\if :has_attempts
\else
  \echo '    !!! جدول exam_attempts وجود ندارد: ساختار exam_attempts قابل‌تشخیص نیست.'
\endif

\echo
\echo '=== 2) تاریخچه‌ی چهار migration مربوط (همه‌ی ردیف‌ها؛ بعد از resolve --rolled-back ممکن است چند ردیف باشد)'
\echo '    APPLIED = finished_at دارد و rolled_back_at خالی  |  FAILED = هر دو خالی  |  ROLLED_BACK_MARK = rolled_back_at دارد'
\if :has_hist
  SELECT m.name AS migration_name,
         CASE WHEN h.migration_name IS NULL THEN 'NO_RECORD (pending)'
              WHEN h.rolled_back_at IS NOT NULL THEN 'ROLLED_BACK_MARK'
              WHEN h.finished_at IS NULL THEN 'FAILED'
              ELSE 'APPLIED' END AS status,
         h.checksum, h.started_at, h.finished_at, h.rolled_back_at, h.applied_steps_count
  FROM (VALUES ('20260912133000_exam_attempt_server_timing'),
               ('20260912175323_add_approval_status'),
               ('20260914191557_add_exam_attempt_unique_constraint'),
               ('20260922100000_fix_exam_attempt_timing_migration_history')) AS m(name)
  LEFT JOIN _prisma_migrations h ON h.migration_name = m.name
  ORDER BY m.name, h.started_at;
\else
  \echo '    (جدول تاریخچه نیست)'
\endif

\echo
\echo '=== 2b) مقایسه‌ی checksum ثبت‌شده‌ی 191557 با فایل (فقط اگر -v file_sha191=... داده باشید)'
\if :has_hist
  \if :{?file_sha191}
    \if :{?file_sha191_crlf}
      SELECT checksum,
             (checksum = :'file_sha191') AS equals_lf_variant,
             (checksum = :'file_sha191_crlf') AS equals_crlf_variant
      FROM _prisma_migrations
      WHERE migration_name = '20260914191557_add_exam_attempt_unique_constraint'
        AND finished_at IS NOT NULL AND rolled_back_at IS NULL;
    \else
      SELECT checksum, (checksum = :'file_sha191') AS equals_lf_variant
      FROM _prisma_migrations
      WHERE migration_name = '20260914191557_add_exam_attempt_unique_constraint'
        AND finished_at IS NOT NULL AND rolled_back_at IS NULL;
    \endif
  \else
    \echo '    (file_sha191 داده نشده؛ checksum ردیف بالا را دستی با sha256 فایل مقایسه کنید)'
  \endif
\endif

\echo
\echo '=== 3) هر migration شکست‌خورده‌ی دیگر (در کل پروژه) + ابتدای متن خطا'
\if :has_hist
  SELECT migration_name, started_at, left(logs, 400) AS error_log_head
  FROM _prisma_migrations
  WHERE finished_at IS NULL AND rolled_back_at IS NULL
  ORDER BY started_at;
  SELECT count(*) AS hist_rows,
         COALESCE(bool_or(migration_name = '20260912133000_exam_attempt_server_timing' AND finished_at IS NOT NULL AND rolled_back_at IS NULL), false) AS applied_133,
         COALESCE(bool_or(migration_name = '20260912175323_add_approval_status' AND finished_at IS NOT NULL AND rolled_back_at IS NULL), false) AS applied_175,
         COALESCE(bool_or(migration_name = '20260914191557_add_exam_attempt_unique_constraint' AND finished_at IS NOT NULL AND rolled_back_at IS NULL), false) AS applied_191,
         COALESCE(bool_or(migration_name = '20260922100000_fix_exam_attempt_timing_migration_history' AND finished_at IS NOT NULL AND rolled_back_at IS NULL), false) AS applied_922,
         COALESCE(bool_or(migration_name = '20260912175323_add_approval_status' AND finished_at IS NULL AND rolled_back_at IS NULL), false) AS failed_175,
         COALESCE(bool_or(migration_name = '20260914191557_add_exam_attempt_unique_constraint' AND finished_at IS NULL AND rolled_back_at IS NULL), false) AS failed_191,
         COALESCE(bool_or(migration_name = '20260922100000_fix_exam_attempt_timing_migration_history' AND finished_at IS NULL AND rolled_back_at IS NULL), false) AS failed_922,
         count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL
                            AND migration_name NOT IN ('20260912175323_add_approval_status',
                                                       '20260914191557_add_exam_attempt_unique_constraint',
                                                       '20260922100000_fix_exam_attempt_timing_migration_history')) AS failed_other,
         COALESCE(string_agg(migration_name, ', ') FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL
                            AND migration_name NOT IN ('20260912175323_add_approval_status',
                                                       '20260914191557_add_exam_attempt_unique_constraint',
                                                       '20260922100000_fix_exam_attempt_timing_migration_history')), '') AS failed_other_names
  FROM _prisma_migrations
  \gset
\else
  \echo '    (جدول تاریخچه نیست)'
\endif

\echo
\echo '=== 4) وضعیت واقعی ساختار exam_attempts'
\echo '    S_FINAL                    = expiresAt الزامی (timestamp(3))، finishedAt nullable، ایندکس یکتای معتبر (examId, studentId) با نام درست'
\echo '    S_REVERTED                 = expiresAt نیست، finishedAt الزامی، هیچ ایندکس یکتایی روی (examId, studentId) نیست (بعد از موفقیت 175323)'
\echo '    S_PARTIAL_INDEX_MISSING    = ستون‌ها مثل S_FINAL، فقط ایندکس یکتا نیست'
\echo '    S_PARTIAL_EXPIRES_NULLABLE = expiresAt هست ولی nullable، finishedAt nullable، ایندکس نیست (نیمه‌کاره‌ی 191557/922100000)'
\echo '    S_PARTIAL_EXPIRES_LOST     = expiresAt نیست ولی finishedAt nullable است (داده‌ی expiresAt از دست رفته؛ فقط با پشتیبان)'
\echo '    S_UNEXPECTED               = هر حالت دیگر (از جمله ایندکسِ هم‌نام ولی غیریکتا/ناقص/نامعتبر): متوقف شوید'
\if :has_attempts
  WITH cols AS (
    SELECT COALESCE(bool_or(a.attname = 'expiresAt'), false) AS has_expires,
           COALESCE(bool_or(a.attname = 'expiresAt' AND a.attnotnull), false) AS expires_not_null,
           COALESCE(bool_or(a.attname = 'expiresAt'
                            AND format_type(a.atttypid, a.atttypmod) = 'timestamp(3) without time zone'), false) AS expires_type_ok,
           COALESCE(bool_or(a.attname = 'finishedAt'), false) AS has_finished,
           COALESCE(bool_or(a.attname = 'finishedAt' AND NOT a.attnotnull), false) AS finished_nullable
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema() AND c.relname = 'exam_attempts'
      AND a.attnum > 0 AND NOT a.attisdropped
  ), ix AS (
    SELECT ic.relname AS idx_name,
           (i.indisunique AND i.indisvalid AND i.indisready
            AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts = 2
            AND ARRAY(SELECT a.attname::text
                      FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
                      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
                      ORDER BY k.ord) = ARRAY['examId', 'studentId']::text[]) AS good
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class ic ON ic.oid = i.indexrelid
    WHERE n.nspname = current_schema() AND c.relname = 'exam_attempts'
  ), idx AS (
    SELECT EXISTS (SELECT 1 FROM pg_class r JOIN pg_namespace n ON n.oid = r.relnamespace
                   WHERE n.nspname = current_schema() AND r.relname = 'exam_attempts_examId_studentId_key') AS idx_named_exists,
           COALESCE(bool_or(idx_name = 'exam_attempts_examId_studentId_key' AND good), false) AS idx_ok,
           COALESCE(bool_or(idx_name <> 'exam_attempts_examId_studentId_key' AND good), false) AS idx_other_unique
    FROM ix
  )
  SELECT has_expires, expires_not_null, expires_type_ok, has_finished, finished_nullable,
         idx_named_exists, idx_ok, idx_other_unique,
         CASE
           WHEN has_expires AND expires_not_null AND expires_type_ok AND finished_nullable AND idx_ok
             THEN 'S_FINAL'
           WHEN NOT has_expires AND has_finished AND NOT finished_nullable AND NOT idx_named_exists AND NOT idx_other_unique
             THEN 'S_REVERTED'
           WHEN has_expires AND expires_not_null AND expires_type_ok AND finished_nullable AND NOT idx_named_exists AND NOT idx_other_unique
             THEN 'S_PARTIAL_INDEX_MISSING'
           WHEN has_expires AND NOT expires_not_null AND expires_type_ok AND finished_nullable AND NOT idx_named_exists AND NOT idx_other_unique
             THEN 'S_PARTIAL_EXPIRES_NULLABLE'
           WHEN NOT has_expires AND has_finished AND finished_nullable AND NOT idx_named_exists AND NOT idx_other_unique
             THEN 'S_PARTIAL_EXPIRES_LOST'
           ELSE 'S_UNEXPECTED'
         END AS state,
         array_to_string(ARRAY[
           CASE WHEN NOT has_expires THEN 'expiresAt:missing'
                WHEN NOT expires_not_null THEN 'expiresAt:nullable'
                WHEN NOT expires_type_ok THEN 'expiresAt:type<>timestamp(3)' END,
           CASE WHEN NOT has_finished THEN 'finishedAt:missing'
                WHEN NOT finished_nullable THEN 'finishedAt:NOT NULL' END,
           CASE WHEN NOT idx_ok THEN
                  CASE WHEN idx_named_exists THEN 'index:name exists but is not a valid unique (examId,studentId) index'
                       WHEN idx_other_unique THEN 'index:equivalent unique index under another name'
                       ELSE 'index:missing' END END
         ], '; ') AS diff_from_final
  FROM cols, idx
  \gset

  \echo '    state                :' :state
  \echo '    تفاوت با S_FINAL     :' :diff_from_final
  \echo '    expiresAt هست؟       :' :has_expires
  \echo '    finishedAt هست؟      :' :has_finished
  \echo '    ایندکس هم‌نام هست؟    :' :idx_named_exists
  \echo '    ایندکس یکتای معتبر    :' :idx_ok '(نام درست)  /' :idx_other_unique '(نام دیگر)'
  \echo
  \echo '    تعریف واقعی ایندکس‌های exam_attempts:'
  SELECT indexname, indexdef FROM pg_indexes
  WHERE schemaname = current_schema() AND tablename = 'exam_attempts' ORDER BY indexname;
\else
  \echo '    (جدول exam_attempts نیست)'
\endif

\echo
\echo '=== 5) تعداد ردیف‌ها: in_progress = تلاش‌های ناتمام (finishedAt خالی)؛ این ردیف‌ها نباید دست‌کاری شوند'
\if :has_finished
  SELECT count(*) AS total_attempts,
         count(*) FILTER (WHERE "finishedAt" IS NULL) AS in_progress
  FROM exam_attempts
  \gset
  \echo '    total_attempts =' :total_attempts ' in_progress_attempts =' :in_progress
\else
  \echo '    (ستون finishedAt یا جدول نیست)'
\endif

\if :has_expires
  SELECT count(*) AS null_expires FROM exam_attempts WHERE "expiresAt" IS NULL
  \gset
  \echo '    ردیف با expiresAt خالی =' :null_expires '(در S_FINAL باید 0 باشد)'
\endif

\echo
\echo '=== 6) ردیف‌های تکراری (examId, studentId): باید «0» باشد، وگرنه ساخت ایندکس یکتا شکست می‌خورد'
\if :has_attempts
  SELECT (count(*) = 2) AS has_pair
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = current_schema() AND c.relname = 'exam_attempts'
    AND a.attnum > 0 AND NOT a.attisdropped AND a.attname IN ('examId', 'studentId')
  \gset
\endif
\if :has_pair
  SELECT count(*) AS dup_groups, (count(*) > 0) AS has_dups FROM (
    SELECT 1 FROM exam_attempts GROUP BY "examId", "studentId" HAVING count(*) > 1
  ) d
  \gset
  \echo '    گروه‌های تکراری =' :dup_groups
  \if :has_dups
    SELECT "examId", "studentId", count(*) AS n
    FROM exam_attempts GROUP BY "examId", "studentId" HAVING count(*) > 1;
  \endif
\else
  \echo '    (جدول exam_attempts یا ستون‌های examId/studentId نیست)'
\endif

\echo
\echo '=== 7) مسیر پیشنهادی (فقط از روی همین خروجی؛ جزئیات هر مسیر در README.fa.md)'
SELECT CASE
  WHEN :other_tables = 0 AND (:'has_hist' = 'f' OR :hist_rows = 0) THEN 'PATH_1_FRESH_INSTALL'
  WHEN :other_tables = 0 THEN 'STOP_HISTORY_WITHOUT_TABLES'
  WHEN :'has_hist' = 'f' THEN 'STOP_NO_PRISMA_HISTORY'
  WHEN :'has_attempts' = 'f' THEN 'STOP_NO_EXAM_ATTEMPTS_TABLE'
  WHEN :failed_other > 0 THEN 'STOP_OTHER_FAILED_MIGRATION'
  WHEN :'state' = 'S_UNEXPECTED' THEN 'STOP_UNEXPECTED_STRUCTURE'
  WHEN :'state' = 'S_PARTIAL_EXPIRES_LOST' THEN 'STOP_EXPIRES_LOST_RESTORE_FROM_BACKUP'
  WHEN :'has_dups' = 't' THEN 'STOP_DUPLICATE_ATTEMPTS'
  WHEN :'failed_175' = 't' AND :'state' IN ('S_FINAL', 'S_PARTIAL_INDEX_MISSING') THEN 'PATH_4_RESOLVE_175_APPLIED'
  WHEN :'failed_175' = 't' THEN 'STOP_175_FAILED_UNEXPECTED_STATE'
  WHEN :'failed_191' = 't' AND :'state' IN ('S_REVERTED', 'S_PARTIAL_EXPIRES_NULLABLE', 'S_PARTIAL_INDEX_MISSING') THEN 'PATH_5_RESOLVE_191_ROLLED_BACK'
  WHEN :'failed_191' = 't' AND :'state' = 'S_FINAL' THEN 'PATH_5B_VERIFIED_RESOLVE_191_APPLIED'
  WHEN :'failed_191' = 't' THEN 'STOP_191_FAILED_UNEXPECTED_STATE'
  WHEN :'failed_922' = 't' AND :'state' IN ('S_PARTIAL_EXPIRES_NULLABLE', 'S_PARTIAL_INDEX_MISSING') THEN 'PATH_6_RESOLVE_922_ROLLED_BACK'
  WHEN :'failed_922' = 't' AND :'state' = 'S_FINAL' THEN 'PATH_6B_VERIFIED_RESOLVE_922_APPLIED'
  WHEN :'failed_922' = 't' THEN 'STOP_922_FAILED_UNEXPECTED_STATE'
  WHEN :'state' = 'S_FINAL' AND :'applied_175' = 'f' AND :'applied_191' = 'f' AND :'applied_133' = 't' THEN 'PATH_3_RESOLVE_175'
  WHEN :'state' = 'S_FINAL' AND :'applied_175' = 'f' AND :'applied_191' = 'f' AND :'applied_133' = 'f' THEN 'STOP_133_NOT_RECORDED_STRUCTURE_FINAL'
  WHEN :'state' = 'S_FINAL' AND :'applied_191' = 't' AND :'applied_922' = 't' THEN 'NONE_UP_TO_DATE'
  WHEN :'state' = 'S_FINAL' AND :'applied_191' = 't' THEN 'PATH_2_DEPLOY'
  WHEN :'state' = 'S_FINAL' AND :'applied_175' = 't' THEN 'PATH_2_DEPLOY'
  WHEN :'state' = 'S_REVERTED' AND :'applied_133' = 't' AND :'applied_175' = 't' AND :'applied_191' = 'f' THEN 'PATH_2_DEPLOY'
  ELSE 'STOP_MANUAL_REVIEW'
END AS recommended_path
\gset
\echo '    recommended_path =' :recommended_path
\if :has_dups
  \echo '    !!! ردیف تکراری (examId, studentId) هست. ساخت ایندکس یکتا تا رفع تکراری‌ها (تصمیم با شما؛ این بسته چیزی حذف نمی‌کند) شکست می‌خورد.'
\endif
\echo '    !!! اگر recommended_path با STOP شروع می‌شود، هیچ resolve/deploy ای نزنید.'

\echo
\echo '=== SUMMARY (قابل‌خواندن برای اسکریپت)'
\pset tuples_only on
\pset format unaligned
SELECT 'SUMMARY state=' || :'state' || ' path=' || :'recommended_path'
       || ' failed_other=' || :failed_other || ' dup_groups=' || :dup_groups
       || ' in_progress=' || :in_progress || ' total_attempts=' || :total_attempts;
