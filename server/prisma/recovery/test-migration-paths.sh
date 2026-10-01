#!/usr/bin/env bash
# server/prisma/recovery/test-migration-paths.sh
#
# تست مسیرهای migration روی یک سرور PostgreSQL «آزمایشی». فقط دیتابیس‌هایی را می‌سازد و
# حذف می‌کند که اسمشان با migtest_ شروع می‌شود. به DATABASE_URL پروژه و دیتابیس واقعی دست نمی‌زند.
#
# پیش‌نیاز: psql، Node و وابستگی‌های نصب‌شده‌ی پروژه (npm ci)، سرور PostgreSQL 13 یا بالاتر
# (docker compose up -d postgres کافی است؛ کاربر POSTGRES_USER باید اجازه‌ی CREATE DATABASE داشته باشد).
#
# اجرا (از هر پوشه):
#   PG_BASE_URL='postgresql://examuser:exampass@localhost:5432' bash server/prisma/recovery/test-migration-paths.sh
# PG_BASE_URL = آدرس سرور بدون نام دیتابیس، بدون / انتهایی و بدون query string.
#
# سناریوها:
#   A نصب تازه            B ارتقا با تلاش‌های تمام‌شده       C ارتقا با تلاش ناتمام (انتظار: شکست، سپس بازیابی)
#   D شکست در migration 191557 (نسخه‌ی اولِ بازسازی‌شده) و بازیابی     E مشاهده‌ی رفتار Prisma با checksum متفاوت
set -uo pipefail

: "${PG_BASE_URL:?PG_BASE_URL را تنظیم کنید (بدون نام دیتابیس)}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$HERE/../.." && pwd)"
REPO_MIGRATIONS="$SERVER_DIR/prisma/migrations"
REPO_SCHEMA="$SERVER_DIR/prisma/schema.prisma"
WORK="$(mktemp -d)"
LOG="$WORK/last.log"
RUN_ID="$$"
PASS=0
FAIL=0
CREATED_DBS=()

M_133="20260912133000_exam_attempt_server_timing"
M_175="20260912175323_add_approval_status"
M_191="20260914191557_add_exam_attempt_unique_constraint"

cleanup() {
  local db
  for db in "${CREATED_DBS[@]:-}"; do
    [ -n "$db" ] && psql "$PG_BASE_URL/postgres" -X -q -c "DROP DATABASE IF EXISTS \"$db\" WITH (FORCE)" >/dev/null 2>&1
  done
  rm -rf "$WORK"
}
trap cleanup EXIT

db_url() { echo "$PG_BASE_URL/$1"; }
q()      { psql "$(db_url "$1")" -X -v ON_ERROR_STOP=1 -tA -c "$2"; }
ok()     { PASS=$((PASS + 1)); echo "  PASS: $1"; }
bad()    {
  FAIL=$((FAIL + 1)); echo "  FAIL: $1"
  case "$1" in
    *deploy*|*resolve*) echo "    --- last Prisma output:"; tail -n 25 "$LOG" | sed 's/^/    | /' ;;
  esac
}
info()   { echo "  INFO: $1"; }
expect_eq()  { if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (expected '$2', got '$1')"; fi; }
expect_neq() { if [ "$1" != "$2" ]; then ok "$3"; else bad "$3 (got '$1')"; fi; }

new_db() {
  local db="migtest_${RUN_ID}_$1"
  psql "$PG_BASE_URL/postgres" -X -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$db\"" >/dev/null || { echo "cannot create $db" >&2; exit 2; }
  CREATED_DBS+=("$db")
  DB="$db"   # متغیر سراسری (در subshell با $(...) فهرست CREATED_DBS گم می‌شد)
}

# Prisma CLI روی یک دیتابیس مشخص؛ خروجی در $LOG ذخیره می‌شود و کد خروج برمی‌گردد
prisma_cmd() {
  local db="$1"; shift
  ( cd "$SERVER_DIR" && DATABASE_URL="$(db_url "$db")" npx --no-install prisma "$@" ) >"$LOG" 2>&1
}
deploy()  { prisma_cmd "$1" migrate deploy --schema "$WORK/prisma/schema.prisma"; }
resolve() { prisma_cmd "$1" migrate resolve "$2" "$3" --schema "$WORK/prisma/schema.prisma"; }

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

# بازسازی «فرضی» نسخه‌ی اولِ 191557 از توضیح خودِ فایل فعلی (ستون الزامی بدون default + ایندکس یکتا).
# متن اصلی در zip نبود؛ این فقط برای شبیه‌سازی شکست روی جدول دارای داده است، نه کپی دقیق.
add_assumed_original_191() {
  mkdir -p "$WORK/prisma/migrations/$M_191"
  cat > "$WORK/prisma/migrations/$M_191/migration.sql" <<'SQL'
ALTER TABLE "exam_attempts" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "exam_attempts" ALTER COLUMN "finishedAt" DROP NOT NULL;
CREATE UNIQUE INDEX "exam_attempts_examId_studentId_key" ON "exam_attempts"("examId", "studentId");
SQL
}

state_of() {
  q "$1" "SELECT COALESCE(bool_or(column_name='expiresAt'),false)::text || ',' ||
                 COALESCE(bool_or(column_name='expiresAt' AND is_nullable='NO'),false)::text || ',' ||
                 COALESCE(bool_or(column_name='finishedAt' AND is_nullable='YES'),false)::text
          FROM information_schema.columns
          WHERE table_schema=current_schema() AND table_name='exam_attempts'"
}
unique_idx_count() {
  q "$1" "SELECT count(*) FROM pg_indexes WHERE schemaname=current_schema() AND tablename='exam_attempts' AND indexname='exam_attempts_examId_studentId_key'"
}
snapshot() {
  q "$1" "SELECT id || '|' || COALESCE(\"finishedAt\"::text,'NULL') || '|' || \"expiresAt\"::text FROM exam_attempts ORDER BY id"
}

# تطابق نهایی با schema.prisma + نبودنِ migration شکست‌خورده/معوق
verify_final() {
  local db="$1" label="$2" rc=0
  expect_eq "$(state_of "$db")" "true,true,true" "$label: exam_attempts در حالت نهایی (expiresAt الزامی، finishedAt nullable)"
  expect_eq "$(unique_idx_count "$db")" "1" "$label: ایندکس یکتای (examId, studentId) موجود"
  expect_eq "$(q "$db" "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL")" "0" "$label: migration شکست‌خورده‌ی باقی‌مانده نیست"
  prisma_cmd "$db" migrate status --schema "$WORK/prisma/schema.prisma" || rc=$?
  expect_eq "$rc" "0" "$label: migrate status (up to date)"
  rc=0
  prisma_cmd "$db" migrate diff --from-url "$(db_url "$db")" --to-schema-datamodel "$REPO_SCHEMA" --exit-code || rc=$?
  expect_eq "$rc" "0" "$label: migrate diff بین دیتابیس و schema.prisma تفاوتی ندارد"
  if [ "$rc" != "0" ]; then
    prisma_cmd "$db" migrate diff --from-url "$(db_url "$db")" --to-schema-datamodel "$REPO_SCHEMA" --script
    sed 's/^/    | /' "$LOG"
  fi
}

# fixtureها: بدون ستون‌های دیرتر؛ مناسب مرحله‌ی بعد از 133000 یا 175323
seed_base() {
  q "$1" "INSERT INTO users(id,role,\"updatedAt\") VALUES ('u1','Instructor', now());
          INSERT INTO exams(id,title,category,\"scheduledAt\",\"durationMinutes\",\"updatedAt\")
          VALUES ('e1','t','c',now(),30,now()),('e2','t','c',now(),30,now());" >/dev/null
}
seed_attempts_with_expires() { # حالت S1: expiresAt واقعیِ متفاوت از finishedAt
  q "$1" "INSERT INTO exam_attempts(id,\"examId\",\"studentId\",answers,\"correctCount\",\"totalQuestions\",\"startedAt\",\"finishedAt\",\"expiresAt\")
          VALUES ('a_done','e1','u1','{}',0,0, now()-interval '120 minutes', now()-interval '100 minutes', now()-interval '90 minutes');" >/dev/null
  if [ "${2:-}" = "with_in_progress" ]; then
    q "$1" "INSERT INTO exam_attempts(id,\"examId\",\"studentId\",answers,\"correctCount\",\"totalQuestions\",\"startedAt\",\"finishedAt\",\"expiresAt\")
            VALUES ('a_live','e2','u1','{}',0,0, now()-interval '5 minutes', NULL, now()+interval '25 minutes');" >/dev/null
  fi
}

echo "== A: نصب تازه روی دیتابیس خالی"
new_db a; db="$DB"; build_dir ALL
rc=0; deploy "$db" || rc=$?
expect_eq "$rc" "0" "A: migrate deploy"
verify_final "$db" "A"

echo "== B: ارتقا از حالت بعد از 133000 با تلاش‌های تمام‌شده (بدون تلاش ناتمام)"
new_db b; db="$DB"; build_dir "$M_133"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "B: مرحله‌ی اولیه تا 133000"
seed_base "$db"; seed_attempts_with_expires "$db"
before="$(snapshot "$db")"
build_dir ALL
rc=0; deploy "$db" || rc=$?
expect_eq "$rc" "0" "B: ارتقای کامل"
after="$(snapshot "$db")"
info "قبل: $before"
info "بعد: $after   (اگر expiresAt عوض شده، مسیر drop و دوباره‌ساختن مقدار واقعی را با finishedAt جایگزین کرده است)"
verify_final "$db" "B"

echo "== C: ارتقا با تلاش ناتمام (انتظار: شکست در 175323، سپس بازیابی بدون حذف داده)"
new_db c; db="$DB"; build_dir "$M_133"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "C: مرحله‌ی اولیه تا 133000"
seed_base "$db"; seed_attempts_with_expires "$db" with_in_progress
before="$(snapshot "$db")"
build_dir ALL
rc=0; deploy "$db" || rc=$?
expect_neq "$rc" "0" "C: انتظار می‌رود deploy روی تلاش ناتمام شکست بخورد"
grep -q "$M_175" "$LOG" && ok "C: شکست مربوط به $M_175 است" || bad "C: نام migration شکست‌خورده در خروجی نیست"
expect_eq "$(state_of "$db")" "true,true,true" "C: بعد از شکست ساختار دست‌نخورده مانده (فرض تراکنشی بودن)"
expect_eq "$(snapshot "$db")" "$before" "C: بعد از شکست داده‌ها دست‌نخورده‌اند"
rc=0; deploy "$db" || rc=$?
expect_neq "$rc" "0" "C: اجرای دوباره‌ی deploy هم تا حل وضعیت شکست می‌خورد (migration اصلاحی خودکار اجرا نمی‌شود)"
grep -q "P3009" "$LOG" && ok "C: خطای P3009 دیده شد" || info "کد P3009 در خروجی نبود؛ خروجی را دستی ببینید"
rc=0; resolve "$db" --applied "$M_175" || rc=$?
expect_eq "$rc" "0" "C: migrate resolve --applied"
rc=0; deploy "$db" || rc=$?
expect_eq "$rc" "0" "C: deploy بعد از resolve"
expect_eq "$(snapshot "$db")" "$before" "C: تلاش ناتمام (finishedAt خالی) و expiresAt واقعی بدون تغییر ماندند"
verify_final "$db" "C"

echo "== D: شکست در 191557 (نسخه‌ی اول، بازسازی فرضی) روی جدول دارای داده، سپس بازیابی با نسخه‌ی فعلی"
new_db d; db="$DB"; build_dir "$M_175"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "D: مرحله‌ی اولیه تا 175323"
seed_base "$db"
q "$db" "INSERT INTO exam_attempts(id,\"examId\",\"studentId\",answers,\"correctCount\",\"totalQuestions\",\"startedAt\",\"finishedAt\")
         VALUES ('a_done','e1','u1','{}',0,0, now()-interval '120 minutes', now()-interval '100 minutes');" >/dev/null
add_assumed_original_191
rc=0; deploy "$db" || rc=$?
expect_neq "$rc" "0" "D: نسخه‌ی اول روی جدول دارای داده شکست می‌خورد"
expect_eq "$(state_of "$db")" "false,false,false" "D: ساختار بعد از شکست در حالت S_REVERTED مانده"
build_dir ALL
rc=0; deploy "$db" || rc=$?
expect_neq "$rc" "0" "D: با وجود فایل اصلاح‌شده، تا resolve نشود خودکار جلو نمی‌رود"
rc=0; resolve "$db" --rolled-back "$M_191" || rc=$?
expect_eq "$rc" "0" "D: migrate resolve --rolled-back"
rc=0; deploy "$db" || rc=$?
expect_eq "$rc" "0" "D: deploy بعد از resolve"
expect_eq "$(q "$db" "SELECT count(*) FROM exam_attempts WHERE \"finishedAt\" IS NULL")" "0" "D: هیچ finishedAt جعل نشد"
expect_eq "$(q "$db" "SELECT (\"finishedAt\" = \"expiresAt\")::text FROM exam_attempts WHERE id='a_done'")" "true" "D: expiresAt ردیف تمام‌شده از finishedAt backfill شد (fallback خود migration)"
verify_final "$db" "D"

echo "== E: مشاهده‌ی رفتار Prisma وقتی نسخه‌ی اول 191557 اجرا شده ولی فایل فعلی متفاوت است (فقط ثبت، بدون assert)"
new_db e; db="$DB"; build_dir "$M_175"
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "E: مرحله‌ی اولیه تا 175323"
add_assumed_original_191
rc=0; deploy "$db" || rc=$?; expect_eq "$rc" "0" "E: نسخه‌ی اول روی جدول خالی موفق است"
rec="$(q "$db" "SELECT checksum FROM _prisma_migrations WHERE migration_name='$M_191'")"
cur="$(sha256sum "$REPO_MIGRATIONS/$M_191/migration.sql" | cut -d' ' -f1)"
info "checksum ثبت‌شده: $rec"
info "checksum فایل فعلی: $cur"
expect_neq "$rec" "$cur" "E: checksum واقعاً متفاوت است (پیش‌شرط مشاهده)"
build_dir ALL
rc=0; deploy "$db" || rc=$?
info "migrate deploy با checksum متفاوت: exit=$rc"; sed 's/^/    | /' "$LOG"
rc=0; prisma_cmd "$db" migrate status --schema "$WORK/prisma/schema.prisma" || rc=$?
info "migrate status: exit=$rc"; sed 's/^/    | /' "$LOG"

echo
echo "نتیجه: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]