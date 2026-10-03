#!/usr/bin/env bash
# server/prisma/recovery/test-migration-paths.sh
#
# تست مسیرهای migration روی یک سرور PostgreSQL «آزمایشی». فقط دیتابیس‌هایی را می‌سازد و حذف می‌کند
# که اسمشان با migtest_ شروع می‌شود. به DATABASE_URL پروژه و دیتابیس واقعی دست نمی‌زند.
# (اتصال به سرور غیرمحلی بدون ALLOW_REMOTE_TEST_SERVER=1 رد می‌شود.)
#
# پیش‌نیازها (همه باید در PATH باشند):
#   bash (نسخه 3.2 یا بالاتر)، psql (نسخه 10 یا بالاتر)، node/npm، sha256sum، perl، diff، cmp، sed، mktemp
#   وابستگی‌های پروژه نصب‌شده: از پوشه‌ی server یک‌بار «npm ci» (باید Prisma 5.22 پروژه در node_modules باشد؛
#   اسکریپت با npx --no-install اجرا می‌کند و چیزی از اینترنت نمی‌گیرد)
#   سرور PostgreSQL نسخه 13 یا بالاتر (DROP DATABASE ... WITH (FORCE))؛ کاربر باید CREATE DATABASE داشته باشد
#   (برای «migrate dev» در سناریوی E، Prisma یک shadow database هم می‌سازد)
# ویندوز: «Git Bash» (همراه Git for Windows) یا WSL. در PowerShell مستقیماً اجرا نمی‌شود؛ README را ببینید.
# فایل باید با پایان‌خط LF ذخیره شود (فایل .gitattributes همین را برای این اسکریپت اعمال می‌کند).
#
# اجرا:
#   PG_BASE_URL='postgresql://examuser:exampass@localhost:5432' bash server/prisma/recovery/test-migration-paths.sh
# PG_BASE_URL = آدرس سرور بدون نام دیتابیس، بدون / انتهایی و بدون query string (مثلاً بدون ?schema=).
#
# اختیاری:
#   ORIG_191_SQL=/path/to/exact-executed-191557.sql
#       نسخه‌ی دقیق اجراشده‌ی migration 191557 که از تاریخچه‌ی Git بیرون کشیده‌اید (README، بخش «پیدا کردن نسخه‌ی اجراشده»).
#       اگر داده نشود، فایل historical-191557.sql استخراج‌شده از Git استفاده می‌شود.
#       این فایل نسخهٔ تاریخی واقعی است؛ تطابق با دیتابیس شما نیازمند مقایسهٔ checksum است.
#   KEEP_WORK=1   پوشه‌ی موقت (لاگ‌ها و migrationهای کپی‌شده) پاک نشود
#
# سناریوها:
#   A  نصب تازه
#   B  ارتقا از حالت بعد از 133000 با تلاش‌های تمام‌شده: مسیر ۳ (resolve --applied 175323 پیش از deploy)؛ داده باید «برابر» بماند
#   Bc کنترل: deploy ساده همان حالت، باید expiresAt را عوض کند (اثبات خطر و حساس‌بودن assert)
#   C  ارتقا با تلاش ناتمام: شکست 175323، بررسی باقی‌ماندهٔ جزئی (ساختار/ایندکس/داده)، بازیابی مسیر ۴
#   D  شکست 191557 (نسخه‌ی اول) روی جدول دارای داده و بازیابی مسیر ۵ با فایل فعلی
#   D2 فایل قدیمی برگردانده‌شده + محیط با 191557 شکست‌خورده: SQL دستی + resolve --applied
#   D3 فایل قدیمی برگردانده‌شده + محیط دارای داده که 191557 هنوز pending است
#   E  رفتار Prisma با checksum متفاوت (deploy/status/dev): قدیمی↔فعلی و LF↔CRLF؛ فقط ثبت
#   F  شبیه‌سازی باقی‌ماندهٔ جزئی (ایندکس یکتا حذف‌شده) + 175323 شکست‌خورده: بازیابی مسیر ۴
#   G  شکست 191557 فعلی روی ردیف تکراری: آزمون واقعی فرض rollback؛ بدون حذف داده
#   H  تشخیص: بدون جدول تاریخچه / بدون exam_attempts / ایندکس هم‌نام ولی نامعتبر
set -uo pipefail

: "${PG_BASE_URL:?PG_BASE_URL را تنظیم کنید (بدون نام دیتابیس)}"
case "$PG_BASE_URL" in
  *\?*|*/) echo "PG_BASE_URL نباید query string یا / انتهایی داشته باشد" >&2; exit 2 ;;
esac
_rest="${PG_BASE_URL#*://}"; _rest="${_rest#*@}"; _host="${_rest%%[:/]*}"
case "$_host" in
  localhost|127.0.0.1|host.docker.internal) ;;
  *) if [ "${ALLOW_REMOTE_TEST_SERVER:-0}" != "1" ]; then
       echo "سرور '$_host' محلی نیست؛ فقط روی PostgreSQL آزمایشی اجرا کنید (یا ALLOW_REMOTE_TEST_SERVER=1)." >&2; exit 2
     fi ;;
esac

export PGCLIENTENCODING=UTF8 PGCONNECT_TIMEOUT=10 CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
ORIG_191_SQL="${ORIG_191_SQL:-}"
if [ -n "$ORIG_191_SQL" ] && [ ! -f "$ORIG_191_SQL" ]; then echo "ORIG_191_SQL پیدا نشد: $ORIG_191_SQL" >&2; exit 2; fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$HERE/../.." && pwd)"
REPO_MIGRATIONS="$SERVER_DIR/prisma/migrations"
REPO_SCHEMA="$SERVER_DIR/prisma/schema.prisma"
DIAG_SQL="$HERE/00_diagnose_readonly.sql"
MANUAL_SQL="$HERE/01_manual_backfill_191557.sql"
# نسخهٔ تاریخی را از بایت‌های Git نگه می‌داریم؛ پایان‌خط fixture نباید تغییر کند.
if [ -z "$ORIG_191_SQL" ]; then
  ORIG_191_SQL="$HERE/historical-191557.sql"
  historical_hash="$(sha256sum "$ORIG_191_SQL" | cut -d' ' -f1)" || exit 2
  if [ "$historical_hash" != "fc2ebe944aae5125449a258a9e2f1054f408669da4c3d3fe0cf01167d9dccfc5" ]; then
    echo "Historical migration checksum mismatch; restore the exact Git bytes before testing." >&2
    exit 2
  fi
  echo "Historical migration source: ca4aa8db705cd79c1cf627515bc395c802a960e2 (Git bytes verified)"
  echo "This does not prove the migration executed on your database has the same checksum."
fi
WORK="$(mktemp -d)"
LOG="$WORK/last.log"
RUN_ID="$$"
PASS=0; FAIL=0
CUR=""; CUR_P=0; CUR_F=0
SUMMARY_LINES=(); E_RESULTS=()
CREATED_DBS=()
ORIG_KIND=""
ORIG_TAG=HISTORICAL_OR_EXTERNAL

M_133="20260912133000_exam_attempt_server_timing"
M_175="20260912175323_add_approval_status"
M_191="20260914191557_add_exam_attempt_unique_constraint"
M_922="20260922100000_fix_exam_attempt_timing_migration_history"

cleanup() {
  local db
  for db in ${CREATED_DBS[@]+"${CREATED_DBS[@]}"}; do
    [ -n "$db" ] && psql "$PG_BASE_URL/postgres" -X -q -c "DROP DATABASE IF EXISTS \"$db\" WITH (FORCE)" >/dev/null 2>&1
  done
  if [ "${KEEP_WORK:-0}" = "1" ]; then echo "پوشه‌ی موقت نگه داشته شد: $WORK"; else rm -rf "$WORK"; fi
}
trap cleanup EXIT

to_native() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else echo "$1"; fi; }
db_url() { echo "$PG_BASE_URL/$1"; }
q() { psql "$(db_url "$1")" -X -v ON_ERROR_STOP=1 -tA -c "$2"; }

flush() {
  [ -n "$CUR" ] || return 0
  local st=PASS; [ "$CUR_F" -eq 0 ] || st=FAIL
  SUMMARY_LINES+=("$st  $CUR  (pass=$CUR_P fail=$CUR_F)")
}
scenario() { flush; CUR="$1"; CUR_P=0; CUR_F=0; echo; echo "== $1"; }
ok()   { PASS=$((PASS + 1)); CUR_P=$((CUR_P + 1)); echo "  PASS: $1"; }
bad()  {
  FAIL=$((FAIL + 1)); CUR_F=$((CUR_F + 1)); echo "  FAIL: $1"
  case "$1" in
    *deploy*|*resolve*|*status*) echo "    --- last Prisma output:"; tail -n 25 "$LOG" 2>/dev/null | sed 's/^/    | /' ;;
  esac
}
info() { echo "  INFO: $1"; }
expect_eq()  { if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (expected '$2', got '$1')"; fi; }
expect_neq() { if [ "$1" != "$2" ]; then ok "$3"; else bad "$3 (got '$1')"; fi; }

new_db() {
  local db="migtest_${RUN_ID}_$1"
  psql "$PG_BASE_URL/postgres" -X -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$db\"" >/dev/null || { echo "cannot create $db" >&2; exit 2; }
  CREATED_DBS+=("$db")
  DB="$db"
}

# ---- Prisma ----
prisma_cmd() {
  local db="$1"; shift
  ( cd "$SERVER_DIR" && DATABASE_URL="$(db_url "$db")" npx --no-install prisma "$@" ) >"$LOG" 2>&1
}
schema_arg() { to_native "$WORK/prisma/schema.prisma"; }
deploy()  { prisma_cmd "$1" migrate deploy --schema "$(schema_arg)"; }
resolve() { prisma_cmd "$1" migrate resolve "$2" "$3" --schema "$(schema_arg)"; }
status()  { prisma_cmd "$1" migrate status --schema "$(schema_arg)"; }

# پوشه‌ی موقت migrationها: تا migration مشخص (شامل خودش) یا ALL
build_dir() {
  rm -rf "$WORK/prisma"; mkdir -p "$WORK/prisma/migrations"
  cp "$REPO_SCHEMA" "$WORK/prisma/schema.prisma"
  cp "$REPO_MIGRATIONS/migration_lock.toml" "$WORK/prisma/migrations/"
  local d
  for d in $(ls -1 "$REPO_MIGRATIONS" | sort); do
    [ -d "$REPO_MIGRATIONS/$d" ] || continue
    cp -r "$REPO_MIGRATIONS/$d" "$WORK/prisma/migrations/$d"
    if [ "$1" != "ALL" ] && [ "$d" = "$1" ]; then break; fi
  done
}

# نسخهٔ واقعی از Git (یا فایل خارجی صریحاً انتخاب‌شده) فقط داخل پوشهٔ تست کپی می‌شود.
put_orig_191() {
  mkdir -p "$WORK/prisma/migrations/$M_191"
  cp "$ORIG_191_SQL" "$WORK/prisma/migrations/$M_191/migration.sql" || exit 2
  ORIG_KIND="HISTORICAL_OR_EXTERNAL (not a simulated stand-in)"
}

# ---- مشاهده‌ی وضعیت ----
state_of() {
  q "$1" "SELECT COALESCE(bool_or(column_name='expiresAt'),false)::text || ',' ||
                 COALESCE(bool_or(column_name='expiresAt' AND is_nullable='NO'),false)::text || ',' ||
                 COALESCE(bool_or(column_name='finishedAt' AND is_nullable='YES'),false)::text
          FROM information_schema.columns
          WHERE table_schema=current_schema() AND table_name='exam_attempts'"
}
unique_idx_ok() {
  q "$1" "SELECT count(*) FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_class c ON c.oid=i.indrelid
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname=current_schema() AND c.relname='exam_attempts' AND ic.relname='exam_attempts_examId_studentId_key'
            AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=2
            AND ARRAY(SELECT a.attname::text FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum,ord)
                      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum ORDER BY k.ord)=ARRAY['examId','studentId']::text[]"
}
# امضای ساختار: ستون‌ها (نوع/nullability) + تعریف کامل همه‌ی ایندکس‌های exam_attempts
struct_sig() {
  q "$1" "SELECT 'col '||a.attname||' '||format_type(a.atttypid,a.atttypmod)||' notnull='||a.attnotnull::text
          FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname=current_schema() AND c.relname='exam_attempts' AND a.attnum>0 AND NOT a.attisdropped
          UNION ALL
          SELECT 'idx '||indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename='exam_attempts'
          ORDER BY 1"
}
hist_sig() {
  q "$1" "SELECT migration_name||'|'||checksum||'|'||COALESCE(finished_at::text,'')||'|'||COALESCE(rolled_back_at::text,'')||'|'||applied_steps_count
          FROM _prisma_migrations ORDER BY migration_name, started_at"
}
mig_status() {
  q "$1" "SELECT COALESCE((SELECT CASE WHEN rolled_back_at IS NOT NULL THEN 'ROLLED_BACK' WHEN finished_at IS NULL THEN 'FAILED' ELSE 'APPLIED' END
                           FROM _prisma_migrations WHERE migration_name='$2' ORDER BY started_at DESC LIMIT 1),'NONE')"
}
# snapshot کامل ردیف‌های exam_attempts روی «ستون‌های مشخص» (پیش‌فرض: همه‌ی ستون‌های فعلی)؛ ردیف‌ها به‌ترتیب id
snap_take() { # db outfile [cols]
  local db="$1" out="$2" cols="${3:-}"
  [ -n "$cols" ] || cols="$(q "$db" "SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='exam_attempts'")"
  SNAP_COLS="$cols"
  q "$db" "SELECT t.id || '|' || (SELECT jsonb_object_agg(e.key, e.value)::text FROM jsonb_each(to_jsonb(t)) e
                                   WHERE e.key = ANY(string_to_array('$cols', ',')))
           FROM exam_attempts t ORDER BY t.id" >"$out"
}
snap_equal() { # label before after
  local rows; rows="$(wc -l <"$2" | tr -d ' ')"
  if [ "$rows" -eq 0 ]; then bad "$1: snapshot خالی است (fixture نامعتبر)"; return; fi
  if cmp -s "$2" "$3"; then ok "$1 (ردیف‌ها=$rows، ستون‌ها=$SNAP_COLS)"
  else bad "$1: داده‌ها تغییر کرده‌اند"; diff -u "$2" "$3" | sed 's/^/    | /' | head -n 40; fi
}
struct_equal() { # label before after
  if cmp -s "$2" "$3"; then ok "$1"; else bad "$1: ساختار تغییر کرده"; diff -u "$2" "$3" | sed 's/^/    | /' | head -n 30; fi
}

# ---- تشخیص (همان 00_diagnose_readonly.sql) ----
DIAG_PATH=""; DIAG_STATE=""
diag() {
  local db="$1"; shift
  if ! psql "$(db_url "$db")" -X -v ON_ERROR_STOP=1 "$@" -f "$DIAG_SQL" >"$WORK/diag.out" 2>&1; then
    bad "diagnose SQL روی $db شکست خورد"; tail -n 20 "$WORK/diag.out" | sed 's/^/    | /'
    DIAG_PATH="ERROR"; DIAG_STATE="ERROR"; return 1
  fi
  DIAG_PATH="$(tr -d '\r' <"$WORK/diag.out" | sed -n 's/^SUMMARY state=[A-Za-z0-9_]* path=\([A-Za-z0-9_]*\) .*$/\1/p' | tail -n1)"
  DIAG_STATE="$(tr -d '\r' <"$WORK/diag.out" | sed -n 's/^SUMMARY state=\([A-Za-z0-9_]*\) path=.*$/\1/p' | tail -n1)"
}
expect_path() { # db expected label
  diag "$1" || return 1
  if [ "$DIAG_PATH" = "$2" ]; then ok "$3 (diagnose: state=$DIAG_STATE path=$DIAG_PATH)"
  else bad "$3 (expected path '$2', got '$DIAG_PATH', state '$DIAG_STATE')"; tail -n 25 "$WORK/diag.out" | sed 's/^/    | /'; fi
}

# تطابق نهایی با schema.prisma + نبودنِ migration شکست‌خورده/معوق (بررسی مستقل از diagnose هم انجام می‌شود)
verify_final() {
  local db="$1" label="$2" rc=0
  expect_path "$db" NONE_UP_TO_DATE "$label: diagnose = S_FINAL و همه‌ی migrationها اجراشده"
  expect_eq "$(state_of "$db")" "true,true,true" "$label: (بررسی مستقل) expiresAt الزامی، finishedAt nullable"
  expect_eq "$(unique_idx_ok "$db")" "1" "$label: (بررسی مستقل) ایندکس یکتای معتبر روی (examId, studentId)"
  expect_eq "$(q "$db" "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL")" "0" "$label: migration شکست‌خورده‌ی باقی‌مانده نیست"
  status "$db" || rc=$?
  expect_eq "$rc" "0" "$label: migrate status (up to date)"
  rc=0
  prisma_cmd "$db" migrate diff --from-url "$(db_url "$db")" --to-schema-datamodel "$(to_native "$REPO_SCHEMA")" --exit-code || rc=$?
  expect_eq "$rc" "0" "$label: migrate diff بین دیتابیس و schema.prisma تفاوتی ندارد (کل schema)"
  if [ "$rc" != "0" ]; then
    prisma_cmd "$db" migrate diff --from-url "$(db_url "$db")" --to-schema-datamodel "$(to_native "$REPO_SCHEMA")" --script
    sed 's/^/    | /' "$LOG" | head -n 40
  fi
}

# ---- fixtureها (مقدارهای ثابت، نه now()) ----
seed_base() {
  q "$1" "INSERT INTO users(id,role,\"updatedAt\") VALUES ('u1','Instructor', now());
          INSERT INTO exams(id,title,category,\"scheduledAt\",\"durationMinutes\",\"updatedAt\")
          VALUES ('e1','t','c',now(),30,now()),('e2','t','c',now(),30,now()),('e3','t','c',now(),30,now());" >/dev/null
}
seed_attempts_with_expires() { # حالت S_FINAL: expiresAt واقعیِ متفاوت از finishedAt
  q "$1" "INSERT INTO exam_attempts(id,\"examId\",\"studentId\",answers,\"correctCount\",\"totalQuestions\",\"startedAt\",\"finishedAt\",\"expiresAt\",\"endedByTimeout\")
          VALUES ('a_done','e1','u1','{\"q1\":\"a\",\"q2\":[1,2]}',7,10, TIMESTAMP '2026-09-01 10:00:00', TIMESTAMP '2026-09-01 10:20:00', TIMESTAMP '2026-09-01 10:45:00', false),
                 ('a_timeout','e2','u1','{\"q1\":null}',2,10, TIMESTAMP '2026-09-02 09:00:00', TIMESTAMP '2026-09-02 09:30:00', TIMESTAMP '2026-09-02 09:30:00', true);" >/dev/null
  if [ "${2:-}" = "with_in_progress" ]; then
    q "$1" "INSERT INTO exam_attempts(id,\"examId\",\"studentId\",answers,\"correctCount\",\"totalQuestions\",\"startedAt\",\"finishedAt\",\"expiresAt\")
            VALUES ('a_live','e3','u1','{\"q1\":\"b\"}',0,10, TIMESTAMP '2026-09-03 12:00:00', NULL, TIMESTAMP '2026-09-03 12:30:00');" >/dev/null
  fi
}
seed_attempts_reverted() { # حالت S_REVERTED: بدون expiresAt، finishedAt الزامی
  q "$1" "INSERT INTO exam_attempts(id,\"examId\",\"studentId\",answers,\"correctCount\",\"totalQuestions\",\"startedAt\",\"finishedAt\",\"endedByTimeout\")
          VALUES ('a_done','e1','u1','{\"q1\":\"a\",\"q2\":[1,2]}',7,10, TIMESTAMP '2026-09-01 10:00:00', TIMESTAMP '2026-09-01 10:20:00', false),
                 ('a_timeout','e2','u1','{\"q1\":null}',2,10, TIMESTAMP '2026-09-02 09:00:00', TIMESTAMP '2026-09-02 09:30:00', true);" >/dev/null
}

# ---------------------------------------------------------------------------------------------
echo "== محیط"
echo "  psql        : $(psql --version 2>&1 | head -n1)"
echo "  PostgreSQL  : $(psql "$PG_BASE_URL/postgres" -X -tA -c 'SHOW server_version' 2>&1 | head -n1)"
echo "  node        : $(node --version 2>&1 | head -n1)"
( cd "$SERVER_DIR" && npx --no-install prisma --version ) 2>&1 | sed 's/^/  prisma      : /' | head -n 12
echo "  نسخه‌ی قدیمی 191557: HISTORICAL_OR_EXTERNAL از $ORIG_191_SQL (sha256 $(sha256sum "$ORIG_191_SQL" | cut -d' ' -f1))"

scenario "A: نصب تازه روی دیتابیس خالی"
new_db a; db="$DB"; build_dir ALL
expect_path "$db" PATH_1_FRESH_INSTALL "A: diagnose روی دیتابیس خالی"
rc=0; deploy "$db" || rc=$?
expect_eq "$rc" "0" "A: migrate deploy"
expect_eq "$(q "$db" "SELECT checksum FROM _prisma_migrations WHERE migration_name='$M_191'")" \
          "$(sha256sum "$REPO_MIGRATIONS/$M_191/migration.sql" | cut -d' ' -f1)" "A: checksum ثبت‌شده‌ی Prisma = sha256 بایت‌های فایل 191557"
verify_final "$db" "A"

scenario "B: مسیر ۳ — 133000 اجراشده، 175323 pending، تلاش‌های تمام‌شده؛ داده باید «برابر» بماند"
new_db b; db="$DB"; build_dir "$M_133"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "B: مرحله‌ی اولیه تا 133000 (deploy)"
seed_base "$db"; seed_attempts_with_expires "$db"
snap_take "$db" "$WORK/b.before"; cols="$SNAP_COLS"
hist_before="$(hist_sig "$db")"
build_dir ALL
# مرحله‌ی برگشتیِ pending باید «پیش از» هر deploy مخرب شناسایی و مدیریت شود
expect_path "$db" PATH_3_RESOLVE_175 "B: pending بودن 175323 روی S_FINAL پیش از اجرای مخرب شناسایی شد"
expect_eq "$(hist_sig "$db")" "$hist_before" "B: diagnose هیچ تغییری در _prisma_migrations نداد"
rc=0; resolve "$db" --applied "$M_175" || rc=$?; expect_eq "$rc" "0" "B: migrate resolve --applied 175323"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "B: migrate deploy بعد از resolve"
snap_take "$db" "$WORK/b.after" "$cols"
snap_equal "B: expiresAt، finishedAt و همه‌ی ستون‌های تلاش‌ها قبل/بعد برابرند" "$WORK/b.before" "$WORK/b.after"
verify_final "$db" "B"

scenario "Bc: کنترل — deploy ساده (بدون resolve) روی همان حالت باید داده را عوض کند (اثبات خطر مسیر ۳ و حساس‌بودن assert)"
new_db bc; db="$DB"; build_dir "$M_133"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "Bc: مرحله‌ی اولیه تا 133000 (deploy)"
seed_base "$db"; seed_attempts_with_expires "$db"
snap_take "$db" "$WORK/bc.before"; cols="$SNAP_COLS"
build_dir ALL
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "Bc: deploy ساده کامل می‌شود (بی‌صدا)"
snap_take "$db" "$WORK/bc.after" "$cols"
if cmp -s "$WORK/bc.before" "$WORK/bc.after"; then bad "Bc: انتظار می‌رفت deploy ساده expiresAt را عوض کند ولی عوض نشد؛ ادعای README (مسیر ۳) تأیید نشد"
else ok "Bc: deploy ساده داده را تغییر داد (خطر واقعی است و assert آن را می‌گیرد)"; diff "$WORK/bc.before" "$WORK/bc.after" | head -n 6 | sed 's/^/    | /'; fi

scenario "C: مسیر ۴ — تلاش ناتمام: شکست 175323، بررسی باقی‌ماندهٔ جزئی (فرض rollback) و بازیابی بدون حذف داده"
new_db c; db="$DB"; build_dir "$M_133"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "C: مرحله‌ی اولیه تا 133000 (deploy)"
seed_base "$db"; seed_attempts_with_expires "$db" with_in_progress
snap_take "$db" "$WORK/c.before"; cols="$SNAP_COLS"; struct_sig "$db" >"$WORK/c.struct.before"
build_dir ALL
expect_path "$db" PATH_3_RESOLVE_175 "C: diagnose پیش از اجرا (in_progress>0؛ deploy ساده شکست می‌خورد، مسیر ۳ همین‌جا هم درست است)"
rc=0; deploy "$db" || rc=$?
expect_neq "$rc" "0" "C: انتظار می‌رود deploy روی تلاش ناتمام شکست بخورد (deploy)"
grep -q "$M_175" "$LOG" && ok "C: شکست مربوط به $M_175 است" || bad "C: نام migration شکست‌خورده در خروجی deploy نیست"
struct_sig "$db" >"$WORK/c.struct.after"
struct_equal "C: [فرض rollback] expiresAt/finishedAt/ایندکس یکتا بعد از شکست دست‌نخورده‌اند" "$WORK/c.struct.before" "$WORK/c.struct.after"
snap_take "$db" "$WORK/c.afterfail" "$cols"
snap_equal "C: [فرض rollback] داده‌ی تلاش‌ها بعد از شکست دست‌نخورده است" "$WORK/c.before" "$WORK/c.afterfail"
expect_eq "$(mig_status "$db" "$M_175")" "FAILED" "C: 175323 در تاریخچه FAILED ثبت شد"
expect_path "$db" PATH_4_RESOLVE_175_APPLIED "C: diagnose بعد از شکست"
if [ "$DIAG_PATH" = "PATH_4_RESOLVE_175_APPLIED" ]; then
  rc=0; deploy "$db" || rc=$?
  expect_neq "$rc" "0" "C: deploy دوباره تا حل وضعیت شکست‌خورده می‌ماند (deploy)"
  grep -q "P3009" "$LOG" && ok "C: خطای P3009 دیده شد" || info "کد P3009 در خروجی نبود؛ خروجی را دستی ببینید"
  rc=0; resolve "$db" --applied "$M_175" || rc=$?; expect_eq "$rc" "0" "C: migrate resolve --applied 175323"
  rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "C: deploy بعد از resolve"
  snap_take "$db" "$WORK/c.after" "$cols"
  snap_equal "C: تلاش ناتمام (finishedAt خالی) و expiresAt واقعی بعد از بازیابی برابرند" "$WORK/c.before" "$WORK/c.after"
  verify_final "$db" "C"
else
  bad "C: مسیر تشخیص‌داده‌شده PATH_4 نیست؛ بازیابی انجام نشد (احتمالاً باقیماندهٔ جزئی؛ خروجی diagnose بالا را ببینید)"
fi

scenario "D: مسیر ۵ — شکست 191557 (نسخه‌ی اول) روی جدول دارای داده و بازیابی با فایل فعلی [نسخه‌ی اول: $ORIG_TAG]"
new_db d; db="$DB"; build_dir "$M_175"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "D: مرحله‌ی اولیه تا 175323 (deploy)"
seed_base "$db"; seed_attempts_reverted "$db"
snap_take "$db" "$WORK/d.before"; cols="$SNAP_COLS"; struct_sig "$db" >"$WORK/d.struct.before"
put_orig_191
rc=0; deploy "$db" || rc=$?; expect_neq "$rc" "0" "D: نسخه‌ی اول 191557 روی جدول دارای داده شکست می‌خورد (deploy)"
struct_sig "$db" >"$WORK/d.struct.after"
struct_equal "D: [فرض rollback] ساختار بعد از شکست دست‌نخورده (S_REVERTED)" "$WORK/d.struct.before" "$WORK/d.struct.after"
build_dir ALL
expect_path "$db" PATH_5_RESOLVE_191_ROLLED_BACK "D: diagnose بعد از شکست"
if [ "$DIAG_PATH" = "PATH_5_RESOLVE_191_ROLLED_BACK" ]; then
  rc=0; deploy "$db" || rc=$?; expect_neq "$rc" "0" "D: تا resolve نشود deploy جلو نمی‌رود (deploy)"
  rc=0; resolve "$db" --rolled-back "$M_191" || rc=$?; expect_eq "$rc" "0" "D: migrate resolve --rolled-back"
  rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "D: deploy بعد از resolve"
  snap_take "$db" "$WORK/d.after" "$cols"
  snap_equal "D: ستون‌های اصلی تلاش‌ها (بدون expiresAt که قبلاً نبود) برابرند" "$WORK/d.before" "$WORK/d.after"
  expect_eq "$(q "$db" "SELECT count(*) FROM exam_attempts WHERE \"expiresAt\" IS DISTINCT FROM \"finishedAt\"")" "0" "D: expiresAt فقط از finishedAt backfill شد (fallback خود migration)"
  expect_eq "$(q "$db" "SELECT count(*) FROM exam_attempts WHERE \"finishedAt\" IS NULL")" "0" "D: هیچ finishedAt جعل/حذف نشد"
  verify_final "$db" "D"
else
  bad "D: مسیر تشخیص‌داده‌شده PATH_5 نیست؛ بازیابی انجام نشد"
fi

scenario "D2: مسیر ۷-ب — فایل قدیمی برگردانده‌شده؛ محیط با 191557 شکست‌خورده: SQL دستی + resolve --applied"
new_db d2; db="$DB"; build_dir "$M_175"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "D2: مرحله‌ی اولیه تا 175323 (deploy)"
seed_base "$db"; seed_attempts_reverted "$db"
snap_take "$db" "$WORK/d2.before"; cols="$SNAP_COLS"
put_orig_191
rc=0; deploy "$db" || rc=$?; expect_neq "$rc" "0" "D2: نسخه‌ی قدیمی روی جدول دارای داده شکست می‌خورد (deploy)"
build_dir ALL; put_orig_191          # سیاست مخزن: فایل 191557 = نسخه‌ی قدیمی؛ migrationهای بعدی سر جایشان
rc=0; psql "$(db_url "$db")" -X -v ON_ERROR_STOP=1 -f "$MANUAL_SQL" >"$LOG" 2>&1 || rc=$?
expect_eq "$rc" "0" "D2: اجرای 01_manual_backfill_191557.sql"
expect_path "$db" PATH_5B_VERIFIED_RESOLVE_191_APPLIED "D2: diagnose بعد از SQL دستی (ساختار S_FINAL و 191557 شکست‌خورده)"
rc=0; resolve "$db" --applied "$M_191" || rc=$?; expect_eq "$rc" "0" "D2: migrate resolve --applied 191557"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "D2: deploy بعد از resolve (فقط 922100000 باقی است)"
expect_eq "$(q "$db" "SELECT checksum FROM _prisma_migrations WHERE migration_name='$M_191' ORDER BY started_at DESC LIMIT 1")" \
          "$(sha256sum "$WORK/prisma/migrations/$M_191/migration.sql" | cut -d' ' -f1)" "D2: checksum ثبت‌شده‌ی 191557 = sha256 فایل برگردانده‌شده"
snap_take "$db" "$WORK/d2.after" "$cols"
snap_equal "D2: داده‌ی تلاش‌ها برابر است" "$WORK/d2.before" "$WORK/d2.after"
expect_eq "$(q "$db" "SELECT count(*) FROM exam_attempts WHERE \"expiresAt\" IS DISTINCT FROM \"finishedAt\"")" "0" "D2: expiresAt فقط از finishedAt backfill شد"
verify_final "$db" "D2"

scenario "D3: مسیر ۷-ب — فایل قدیمی برگردانده‌شده؛ محیط دارای داده که 191557 هنوز pending است"
new_db d3; db="$DB"; build_dir "$M_175"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "D3: مرحله‌ی اولیه تا 175323 (deploy)"
seed_base "$db"; seed_attempts_reverted "$db"
snap_take "$db" "$WORK/d3.before"; cols="$SNAP_COLS"
build_dir ALL; put_orig_191
rc=0; psql "$(db_url "$db")" -X -v ON_ERROR_STOP=1 -f "$MANUAL_SQL" >"$LOG" 2>&1 || rc=$?
expect_eq "$rc" "0" "D3: اجرای 01_manual_backfill_191557.sql"
expect_path "$db" PATH_2_DEPLOY "D3: diagnose (S_FINAL؛ 191557 هنوز بدون ردیف)"
rc=0; resolve "$db" --applied "$M_191" || rc=$?; expect_eq "$rc" "0" "D3: migrate resolve --applied 191557 (پیش از deploy، چون فایل قدیمی ستون موجود را دوباره اضافه می‌کند)"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "D3: deploy بعد از resolve"
snap_take "$db" "$WORK/d3.after" "$cols"
snap_equal "D3: داده‌ی تلاش‌ها برابر است" "$WORK/d3.before" "$WORK/d3.after"
verify_final "$db" "D3"

scenario "E: رفتار Prisma با checksum متفاوت (ثبت‌شده ≠ فایل مخزن) [نسخه‌ی قدیمی: $ORIG_TAG] — فقط ثبت، بدون assert روی رفتار"
probe() { # db label : deploy / status / dev(--create-only) را روی پوشه‌ی موقت جاری اجرا و کد خروج را ثبت می‌کند
  local db="$1" label="$2" r1=0 r2=0 r3=0
  deploy "$db" || r1=$?;                         info "$label — migrate deploy: exit=$r1"; head -n 12 "$LOG" | sed 's/^/    | /'
  status "$db" || r2=$?;                         info "$label — migrate status: exit=$r2"; head -n 16 "$LOG" | sed 's/^/    | /'
  prisma_cmd "$db" migrate dev --create-only --name probe --skip-generate --skip-seed --schema "$(schema_arg)" </dev/null || r3=$?
  info "$label — migrate dev --create-only (غیرتعاملی): exit=$r3"; head -n 16 "$LOG" | sed 's/^/    | /'
  E_RESULTS+=("$label | deploy=$r1 status=$r2 dev=$r3")
}
new_db e1; db="$DB"; build_dir "$M_175"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "E1: مرحله‌ی اولیه تا 175323 (deploy)"
put_orig_191
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "E1: نسخه‌ی قدیمی روی جدول خالی موفق است (deploy)"
rec="$(q "$db" "SELECT checksum FROM _prisma_migrations WHERE migration_name='$M_191'")"
cur="$(sha256sum "$REPO_MIGRATIONS/$M_191/migration.sql" | cut -d' ' -f1)"
info "checksum ثبت‌شده: $rec"; info "checksum فایل فعلی: $cur"
expect_neq "$rec" "$cur" "E1: checksum واقعاً متفاوت است (پیش‌شرط مشاهده؛ اگر نسخه‌ی واقعی با فایل فعلی بایت‌به‌بایت برابر است FAIL طبیعی است)"
build_dir ALL
probe "$db" "E1 (DB=قدیمی، مخزن=فعلی)"
new_db e2; db="$DB"; build_dir ALL
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "E2: نصب با فایل فعلی (deploy)"
put_orig_191
probe "$db" "E2 (DB=فعلی، مخزن=قدیمی)"
new_db e3; db="$DB"; build_dir ALL
perl -pi -e 's/\r?\n/\n/' "$WORK/prisma/migrations/$M_191/migration.sql"      # اول مطمئن می‌شویم فایل LF است (در ویندوز checkout معمولاً CRLF است)
info "E3: sha256 فایل با LF: $(sha256sum "$WORK/prisma/migrations/$M_191/migration.sql" | cut -d' ' -f1)"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "E3: نصب با فایل LF (deploy)"
rec="$(q "$db" "SELECT checksum FROM _prisma_migrations WHERE migration_name='$M_191'")"
perl -pi -e 's/\n/\r\n/' "$WORK/prisma/migrations/$M_191/migration.sql"      # همان محتوا، فقط پایان‌خط CRLF
crlf="$(sha256sum "$WORK/prisma/migrations/$M_191/migration.sql" | cut -d' ' -f1)"
info "E3: checksum ثبت‌شده (LF): $rec"
info "E3: sha256 همان فایل با CRLF: $crlf"
expect_neq "$rec" "$crlf" "E3: LF و CRLF checksum متفاوت می‌دهند (Prisma بایت خام را hash می‌کند)"
probe "$db" "E3 (DB=LF، مخزن=همان محتوا با CRLF)"

scenario "F: (باقیماندهٔ جزئی شبیه‌سازی‌شده) ایندکس یکتا حذف شده + 175323 شکست‌خورده → مسیر ۴ بدون حذف داده"
new_db f; db="$DB"; build_dir "$M_133"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "F: مرحله‌ی اولیه تا 133000 (deploy)"
seed_base "$db"; seed_attempts_with_expires "$db" with_in_progress
snap_take "$db" "$WORK/f.before"; cols="$SNAP_COLS"
q "$db" 'DROP INDEX "exam_attempts_examId_studentId_key"' >/dev/null    # شبیه‌سازی باقیمانده؛ این رفتار واقعی Prisma نیست
build_dir ALL
rc=0; deploy "$db" || rc=$?; expect_neq "$rc" "0" "F: 175323 شکست می‌خورد (deploy)"
expect_path "$db" PATH_4_RESOLVE_175_APPLIED "F: diagnose"
expect_eq "$DIAG_STATE" "S_PARTIAL_INDEX_MISSING" "F: state = S_PARTIAL_INDEX_MISSING"
if [ "$DIAG_PATH" = "PATH_4_RESOLVE_175_APPLIED" ]; then
  rc=0; resolve "$db" --applied "$M_175" || rc=$?; expect_eq "$rc" "0" "F: migrate resolve --applied 175323"
  rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "F: deploy بعد از resolve (191557 ایندکس را دوباره می‌سازد)"
  snap_take "$db" "$WORK/f.after" "$cols"
  snap_equal "F: داده‌ها (از جمله تلاش ناتمام) برابرند" "$WORK/f.before" "$WORK/f.after"
  verify_final "$db" "F"
fi

scenario "G: شکست 191557 فعلی روی ردیف تکراری — آزمون واقعی فرض rollback، بدون حذف داده"
new_db g; db="$DB"; build_dir "$M_175"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "G: مرحله‌ی اولیه تا 175323 (deploy)"
seed_base "$db"; seed_attempts_reverted "$db"
q "$db" "INSERT INTO exam_attempts(id,\"examId\",\"studentId\",answers,\"correctCount\",\"totalQuestions\",\"startedAt\",\"finishedAt\")
         VALUES ('a_dup','e1','u1','{}',1,10, TIMESTAMP '2026-09-04 08:00:00', TIMESTAMP '2026-09-04 08:10:00')" >/dev/null
snap_take "$db" "$WORK/g.before"; cols="$SNAP_COLS"; struct_sig "$db" >"$WORK/g.struct.before"
build_dir ALL
expect_path "$db" STOP_DUPLICATE_ATTEMPTS "G: diagnose ردیف تکراری را پیش از deploy می‌بیند و توقف می‌دهد"
info "برای آزمودن فرض rollback، فقط روی این دیتابیس آزمایشی عمداً deploy را اجرا می‌کنیم"
rc=0; deploy "$db" || rc=$?; expect_neq "$rc" "0" "G: 191557 روی تکراری شکست می‌خورد (deploy)"
grep -qi "duplicate" "$LOG" && ok "G: پیام خطا درباره‌ی ردیف تکراری است" || bad "G: پیام duplicate در خروجی deploy نیست"
struct_sig "$db" >"$WORK/g.struct.after"
struct_equal "G: [فرض rollback] اگر 191557 وسط راه شکست بخورد، هیچ تغییر ساختاری (expiresAt/nullability) نمی‌ماند" "$WORK/g.struct.before" "$WORK/g.struct.after"
snap_take "$db" "$WORK/g.after" "$cols"
snap_equal "G: [فرض rollback] داده‌ها بعد از شکست دست‌نخورده‌اند (backfill نیمه‌کاره نمانده)" "$WORK/g.before" "$WORK/g.after"
expect_eq "$(mig_status "$db" "$M_191")" "FAILED" "G: 191557 در تاریخچه FAILED ثبت شد"
rc=0; resolve "$db" --rolled-back "$M_191" || rc=$?; expect_eq "$rc" "0" "G: migrate resolve --rolled-back (فقط برای آزمون تکرار؛ تکراری‌ها هنوز هستند)"
rc=0; deploy "$db" || rc=$?; expect_neq "$rc" "0" "G: اجرای دوباره باز هم با همان علت شکست می‌خورد (deploy)"
struct_sig "$db" >"$WORK/g.struct.after2"; snap_take "$db" "$WORK/g.after2" "$cols"
struct_equal "G: بعد از اجرای دوباره هم ساختار دست‌نخورده" "$WORK/g.struct.before" "$WORK/g.struct.after2"
snap_equal "G: بعد از اجرای دوباره هم داده دست‌نخورده" "$WORK/g.before" "$WORK/g.after2"

scenario "H: تشخیص حالت‌های ناقص و ایندکس هم‌نامِ نامعتبر"
new_db h1; db="$DB"
q "$db" "CREATE TABLE exam_attempts(id text primary key)" >/dev/null
expect_path "$db" STOP_NO_PRISMA_HISTORY "H1: جدول هست ولی تاریخچه‌ی Prisma نیست"
new_db h2; db="$DB"
q "$db" "CREATE TABLE _prisma_migrations(id varchar(36) primary key, checksum varchar(64) not null, finished_at timestamptz,
                                         migration_name varchar(255) not null, logs text, rolled_back_at timestamptz,
                                         started_at timestamptz not null default now(), applied_steps_count int not null default 0);
         CREATE TABLE some_other_table(id int)" >/dev/null
expect_path "$db" STOP_NO_EXAM_ATTEMPTS_TABLE "H2: تاریخچه هست ولی exam_attempts نیست"
new_db h3; db="$DB"; build_dir ALL
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "H3: نصب تازه (deploy)"
i=0
for variant in 'CREATE INDEX "exam_attempts_examId_studentId_key" ON exam_attempts("examId","studentId")' \
               'CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON exam_attempts("examId")' \
               'CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON exam_attempts("studentId","examId")' \
               'CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON exam_attempts("examId","studentId") WHERE "finishedAt" IS NOT NULL'; do
  i=$((i + 1))
  q "$db" 'DROP INDEX "exam_attempts_examId_studentId_key"' >/dev/null
  q "$db" "$variant" >/dev/null
  expect_path "$db" STOP_UNEXPECTED_STRUCTURE "H3.$i: ایندکس هم‌نام ولی نامعتبر (غیریکتا/ستون اشتباه/ترتیب اشتباه/جزئی) معادل معتبر حساب نمی‌شود"
done
flush

echo
echo "================ خلاصه ================"
printf '%s\n' ${SUMMARY_LINES[@]+"${SUMMARY_LINES[@]}"} | sed 's/^/  /'
if [ "${#E_RESULTS[@]}" -gt 0 ]; then
  echo "  --- ماتریس سناریوی E (کد خروج؛ 0 = موفق)  [نسخه‌ی قدیمی: ${ORIG_KIND:-?}]"
  printf '  %s\n' "${E_RESULTS[@]}"
fi
echo "نتیجه: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
