# راهنمای migrationهای زمان‌بندی تلاش آزمون (exam_attempts)

## وضعیت اعتبارسنجی این راهنما (صادقانه)

| مورد | وضعیت |
|---|---|
| `00_diagnose_readonly.sql`، `01_manual_backfill_191557.sql`، `test-migration-paths.sh` | اجرای واقعی اول: ۱۲۱ PASS و ۱ FAIL (سناریوی H1: تشخیص روی جدولی که ستون `examId` ندارد خطا می‌داد؛ اصلاح شد و باید دوباره اجرا شود). سناریوهای D، D2، D3 و E با نسخه‌ی **شبیه‌سازی‌شده** از `191557` اجرا شده‌اند |
| فرض «شکست migration همه‌ی تغییرهایش را برمی‌گرداند» | **در یک اجرای واقعی تأیید شد** (PostgreSQL 16.15، Prisma 5.22.0، ویندوز): بعد از شکست `175323` (سناریوی C) و شکست `191557` بعد از چند دستور موفق (سناریوی G)، ساختار و داده‌ی `exam_attempts` دست‌نخورده ماند. فقط همین دو شکست آزموده شده؛ نسخه‌ی دیگر Prisma/PostgreSQL آزموده نشده |
| رفتار Prisma با checksum متفاوت | **مشاهده شد (Prisma 5.22.0)**: `migrate deploy` و `migrate status` تفاوت را نمی‌بینند (exit=0)؛ جدول مسیر ۷ را ببینید |
| نسخه‌ی دقیق اجراشده‌ی `191557` | **پیدا نشده**: بسته‌ی zip پوشه‌ی `.git` ندارد. دستور پیدا کردن آن در مسیر ۷ آمده و باید روی کلون واقعی اجرا شود |

تا وقتی خروجی واقعی `test-migration-paths.sh` در دست نیست، این راهنما را «رفع‌شده» ندانید.

## پیش‌نیازها

- `psql` نسخه‌ی ۱۰ یا بالاتر (برای `\if` و `\gset`)، سرور PostgreSQL ‏۱۱ یا بالاتر (تست: ۱۳ یا بالاتر)، `pg_dump`.
- Node و وابستگی‌های نصب‌شده‌ی پروژه (`npm ci`) تا `npx prisma` همان نسخه‌ی پروژه (5.22) باشد.
- برای `test-migration-paths.sh`: Bash، `sha256sum`، `perl`، `diff`، `cmp`، `sed`، `mktemp`. در ویندوز: **Git Bash** (همراه Git for Windows) یا **WSL** (psql و Node باید داخل خودِ WSL نصب باشند). در PowerShell مستقیماً اجرا نمی‌شود.
- `DATABASE_URL` پروژه ممکن است `?schema=public` داشته باشد؛ `psql` و `pg_dump` این پارامتر را نمی‌شناسند. در همه‌ی دستورهای زیر از `PSQL_URL` (همان آدرس بدون `?...`) استفاده می‌شود.

Bash (از پوشه‌ی `server`):

```bash
export PSQL_URL="${DATABASE_URL%%\?*}"
```

PowerShell (از پوشه‌ی `server`):

```powershell
$env:PSQL_URL = ($env:DATABASE_URL -replace '\?.*$','')
```

## جدول migrationهای مرتبط

| ترتیب | migration | کاری که می‌کند |
|---|---|---|
| ۱ | `20260912133000_exam_attempt_server_timing` | `expiresAt` را اضافه می‌کند (backfill از `finishedAt`)، `finishedAt` را nullable می‌کند، ایندکس یکتا می‌سازد |
| ۲ | `20260912175323_add_approval_status` | همان‌ها را برمی‌گرداند: ایندکس را حذف، `expiresAt` را **حذف** (داده‌اش از بین می‌رود)، `finishedAt` را الزامی می‌کند. اسمش گمراه‌کننده است |
| ۳ | `20260914191557_add_exam_attempt_unique_constraint` | دوباره `expiresAt` و ایندکس یکتا (نسخه‌ی فعلی idempotent و داده‌نگهدار است) |
| ۴ | `20260922100000_fix_exam_attempt_timing_migration_history` | اصلاحی idempotent |

حالت نهایی درست (`S_FINAL`) = `schema.prisma`: `expiresAt` الزامی از نوع `timestamp(3)`، `finishedAt` nullable، ایندکس یکتای معتبر `exam_attempts_examId_studentId_key` روی `(examId, studentId)` به همین ترتیب.

نکته: migration `922100000` وجود ایندکس را فقط با «نام» می‌سنجد (بدون schema و بدون بررسی یکتا بودن). چون فایل‌های اجراشده نباید تغییر کنند (checksum)، دست نخورده مانده؛ به همین دلیل تشخیص فقط‌خواندنی ایندکس را سخت‌گیرانه می‌سنجد.

## قواعد ثابت

- هیچ‌کدام از فایل‌های migration تغییر نکرده‌اند.
- جدول `_prisma_migrations` را هرگز با `UPDATE` یا `DELETE` دستی تغییر ندهید. فقط `prisma migrate resolve`.
- `migrate reset`، `db push --force-reset`، حذف ردیف یا حذف دیتابیس **راهکار هیچ دیتابیس موجودی نیست**.
- برای تلاش ناتمام (`finishedAt` خالی) زمان پایان نسازید؛ `expiresAt` فقط از همان مقدار واقعی یا `finishedAt` موجود پر می‌شود.
- هر مسیر روی دیتابیس واقعی: پشتیبان، توقف نوشتن برنامه، و فقط وقتی تشخیص مسیر دقیقاً مشخص کرده است. اگر `recommended_path` با `STOP` شروع شد، هیچ `resolve` یا `deploy` نزنید.

پشتیبان (Bash، از پوشه‌ی `server`؛ نتیجه در `.gitignore` نادیده گرفته می‌شود و commit نشود):

```bash
pg_dump --format=custom --file="backup_before_migration_$(date +%Y%m%d_%H%M%S).dump" "$PSQL_URL"
```

PowerShell (با `--file`؛ از `>` برای دامپ باینری استفاده نکنید، فایل را خراب می‌کند):

```powershell
pg_dump --format=custom --file="backup_before_migration_$(Get-Date -Format yyyyMMdd_HHmmss).dump" $env:PSQL_URL
```

## گام ۰: تشخیص (فقط‌خواندنی)

Bash:

```bash
psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -f prisma/recovery/00_diagnose_readonly.sql
npx prisma migrate status
```

PowerShell:

```powershell
psql $env:PSQL_URL -X -v ON_ERROR_STOP=1 -f prisma\recovery\00_diagnose_readonly.sql
npx prisma migrate status
```

`ON_ERROR_STOP` در خودِ فایل هم روشن است، ولی آگاهانه بنویسید تا شکست SQL پنهان نماند. خروجی آخر یک خط `SUMMARY state=... path=...` است. اگر `psql` خطا داد، تشخیص ناقص است؛ ادامه ندهید.

مقایسه‌ی checksum ثبت‌شده‌ی `191557` با فایل (اختیاری، همان اجرای بالا با دو `-v`):

```bash
F=prisma/migrations/20260914191557_add_exam_attempt_unique_constraint/migration.sql
LF=$(sha256sum "$F" | cut -d' ' -f1); CRLF=$(perl -pe 's/\r?\n/\r\n/' "$F" | sha256sum | cut -d' ' -f1)
psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -v file_sha191="$LF" -v file_sha191_crlf="$CRLF" -f prisma/recovery/00_diagnose_readonly.sql
```

```powershell
$F = 'prisma\migrations\20260914191557_add_exam_attempt_unique_constraint\migration.sql'
function Get-Sha([string]$text) { $b=[Text.UTF8Encoding]::new($false).GetBytes($text); ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($b)) -replace '-','').ToLower() }
$t = [IO.File]::ReadAllText((Resolve-Path $F)).Replace("`r`n","`n")
$LF = Get-Sha $t; $CRLF = Get-Sha ($t.Replace("`n","`r`n"))
psql $env:PSQL_URL -X -v ON_ERROR_STOP=1 -v file_sha191=$LF -v file_sha191_crlf=$CRLF -f prisma\recovery\00_diagnose_readonly.sql
```

(این دو بلاک مقایسه هنوز روی ویندوز و PostgreSQL واقعی آزموده نشده‌اند.) checksum فایل فعلی در این بسته: `4308268525cf07a899248472a2b83ff3c0afe7b0440cafe66de1c2c4642133ee` (فایل LF است و CR ندارد؛ همین محتوا با CRLF می‌شود `aef613b9aa1c21db3a08a6df7829222c357e750d678b40f03db4761902b27421`).

### نگاشت `recommended_path` به مسیر

| `recommended_path` | معنی | مسیر |
|---|---|---|
| `PATH_1_FRESH_INSTALL` | دیتابیس خالی | ۱ |
| `PATH_2_DEPLOY` | بدون شکست و بدون وضعیت معلق خطرناک | ۲ |
| `PATH_3_RESOLVE_175` | `133000` اجراشده، `175323` pending، ساختار `S_FINAL` | ۳ |
| `PATH_4_RESOLVE_175_APPLIED` | `175323` شکست‌خورده، ساختار `S_FINAL` (یا فقط ایندکس نیست) | ۴ |
| `PATH_5_RESOLVE_191_ROLLED_BACK` | `191557` شکست‌خورده، ساختار `S_REVERTED` یا نیمه‌کاره‌ی قابل‌تکرار | ۵ |
| `PATH_5B_VERIFIED_RESOLVE_191_APPLIED` | `191557` شکست‌خورده ولی ساختار `S_FINAL` | ۵-ب |
| `PATH_6_RESOLVE_922_ROLLED_BACK` / `PATH_6B_...` | `922100000` شکست‌خورده | ۶ |
| `STOP_DUPLICATE_ATTEMPTS` | ردیف تکراری `(examId, studentId)` | توقف؛ تصمیم ادغام با شماست |
| `STOP_NO_PRISMA_HISTORY` | جدول هست، تاریخچه‌ی Prisma نیست | توقف؛ baseline لازم است (خارج از این بسته) |
| `STOP_NO_EXAM_ATTEMPTS_TABLE` | تاریخچه هست، `exam_attempts` نیست | توقف |
| `STOP_EXPIRES_LOST_RESTORE_FROM_BACKUP` | `expiresAt` حذف شده ولی `finishedAt` هنوز nullable | بخش «بازیابی از پشتیبان» |
| `STOP_UNEXPECTED_STRUCTURE` | از جمله ایندکس هم‌نام ولی غیریکتا/ستون اشتباه/جزئی/نامعتبر | توقف؛ بررسی دستی |
| سایر `STOP_*` | | توقف؛ بررسی دستی |

## مسیر ۱: نصب تازه

```bash
npx prisma migrate deploy
```

بعد «بررسی نهایی».

## مسیر ۲: دیتابیس موجود، بدون شکست و بدون وضعیت معلق

فقط وقتی `recommended_path = PATH_2_DEPLOY`:

```bash
npx prisma migrate deploy
```

## مسیر ۳: `133000` اجراشده، `175323` هنوز pending، ساختار `S_FINAL`

`migrate deploy` ساده در این حالت بی‌صدا `expiresAt` را حذف و از `finishedAt` دوباره می‌سازد (مقدار واقعی از بین می‌رود). سناریوی Bc این را عمداً اجرا و مقایسه می‌کند. مسیر امن: مرحله‌ی برگشتی را **اجرا نکنید**، فقط ثبت کنید، و سپس بقیه را بزنید.

```bash
npx prisma migrate resolve --applied 20260912175323_add_approval_status
npx prisma migrate deploy
```

سناریوی B قبل و بعد از این مسیر همه‌ی ستون‌های `exam_attempts` (از جمله `expiresAt`، `finishedAt` و ردیف ناتمام) را snapshot و برابری را assert می‌کند. اگر `recommended_path = STOP_133_NOT_RECORDED_STRUCTURE_FINAL` بود (یعنی خودِ `133000` هم ثبت نشده ولی ساختار نهایی است)، خودکار ادامه ندهید؛ تاریخچه‌ی ساخت آن دیتابیس را بررسی کنید.

## مسیر ۴: `175323` شکست‌خورده، ساختار `S_FINAL` یا `S_PARTIAL_INDEX_MISSING`

علت معمول: تلاش ناتمام و `SET NOT NULL` رد شده. تأیید «چیزی نیمه‌کاره نمانده» با گام ۰ است. اگر ایندکس یکتا نیست ولی ستون‌ها نهایی‌اند (`S_PARTIAL_INDEX_MISSING`)، `191557` آن را دوباره می‌سازد (به شرط نبود تکراری).

۱. پشتیبان؛ `in_progress` را یادداشت کنید. ۲:

```bash
npx prisma migrate resolve --applied 20260912175323_add_approval_status
npx prisma migrate deploy
```

۳. «بررسی نهایی»؛ `in_progress` باید همان عدد قبل باشد. برای این حالت `--rolled-back` را نزنید: اجرای دوباره‌ی `175323` دوباره شکست می‌خورد یا (بدون تلاش ناتمام) `expiresAt` را حذف می‌کند.

## مسیر ۵: `191557` شکست‌خورده

اگر `STOP_DUPLICATE_ATTEMPTS` نیست و ساختار `S_REVERTED` یا نیمه‌کاره‌ی قابل‌تکرار (`S_PARTIAL_EXPIRES_NULLABLE`، `S_PARTIAL_INDEX_MISSING`) است:

```bash
npx prisma migrate resolve --rolled-back 20260914191557_add_exam_attempt_unique_constraint
npx prisma migrate deploy
```

نسخه‌ی فعلی `191557` idempotent است (`ADD COLUMN IF NOT EXISTS`، backfill فقط روی مقدار خالی، `CREATE UNIQUE INDEX IF NOT EXISTS`) و اگر ردیفی بدون مقدار بماند یا تکراری باشد با پیام روشن متوقف می‌شود. ردیف تکراری را این بسته حذف نمی‌کند.

**مسیر ۵-ب** (`191557` شکست‌خورده ولی ساختار از قبل `S_FINAL`، مثلاً بعد از اجرای SQL دستی): اگر فایل مخزن نسخه‌ی **فعلی** است، همان `--rolled-back` و `deploy` بالا امن است (همه‌ی مراحل no-op می‌شوند). اگر فایل مخزن نسخه‌ی **قدیمی برگردانده‌شده** است، اجرای دوباره‌اش خطای «ستون موجود است» می‌دهد؛ به‌جای آن:

```bash
npx prisma migrate resolve --applied 20260914191557_add_exam_attempt_unique_constraint
npx prisma migrate deploy
```

## مسیر ۶: `922100000` شکست‌خورده

۱. متن خطا را از بخش ۳ تشخیص بخوانید (فقط وقتی متوقف می‌شود که ردیفی `expiresAt` خالی داشته باشد و از `finishedAt` هم پر نشود). ۲. مقدار درست را از منبع واقعی خودتان وارد کنید (حدسی نسازید). ۳.

```bash
npx prisma migrate resolve --rolled-back 20260922100000_fix_exam_attempt_timing_migration_history
npx prisma migrate deploy
```

## فرض rollback و باقی‌مانده‌ی جزئی

README قبلی فرض می‌کرد شکست یک migration همه‌ی تغییرهایش را برمی‌گرداند. این **آزموده نشده** است. استدلال ایستا (بدون اجرا، فقط راهنمای پیش‌بینی):

- در `175323` دستور `ALTER TABLE ... DROP COLUMN, SET NOT NULL` یک دستور واحد و اتمی است. حتی اگر Prisma آن را در تراکنش نگذارد، تنها باقی‌مانده‌ی ممکن پس از شکست، **حذف‌شدن ایندکس یکتا** است (حالت `S_PARTIAL_INDEX_MISSING`) و `expiresAt` از بین نمی‌رود.
- `191557` فعلی و `922100000` idempotent‌اند؛ باقی‌مانده‌ی ممکن آن‌ها (`expiresAt` nullable و backfill‌شده) با اجرای دوباره درست می‌شود (`S_PARTIAL_EXPIRES_NULLABLE`).
- سناریوی C (شکست `175323`) و G (شکست `191557` روی ردیف تکراری، یعنی بعد از چند دستور موفق) وضعیت واقعی را می‌سنجند و assert می‌کنند که ساختار و داده بعد از شکست دست‌نخورده‌اند. اگر FAIL شدند، فرض غلط است و جدول زیر مسیر بازیابی هر باقی‌مانده است. سناریوی F مسیر ۴ را روی باقی‌مانده‌ی شبیه‌سازی‌شده‌ی `S_PARTIAL_INDEX_MISSING` می‌آزماید.

| وضعیت باقی‌مانده | مسیر |
|---|---|
| `S_PARTIAL_INDEX_MISSING` با `175323` شکست‌خورده | مسیر ۴ |
| `S_PARTIAL_EXPIRES_NULLABLE` با `191557` یا `922100000` شکست‌خورده | مسیر ۵ / ۶ (اجرای دوباره امن است) |
| `S_PARTIAL_EXPIRES_LOST` (`expiresAt` حذف شده) | فقط بازیابی از پشتیبان (پایین) |

`migrate resolve` را بدون دیدن `state` و `recommended_path` توصیه نمی‌کنیم.

### بازیابی از پشتیبان (فقط `S_PARTIAL_EXPIRES_LOST`؛ آزموده نشده)

مقدار از دست‌رفته‌ی `expiresAt` را فقط پشتیبان دارد. پشتیبان را در یک دیتابیس **جداگانه** restore کنید (نه روی دیتابیس اصلی)، فقط `(id, expiresAt)` را بیرون بکشید و برای ردیف‌هایی که ساختن آن‌ها بعد از پشتیبان بوده، مقدار را از منبع واقعی خودتان بیاورید (زمان حدسی نسازید).

```bash
createdb scratch_restore
pg_restore --no-owner --dbname=scratch_restore backup_before_migration_XXXX.dump
psql scratch_restore -X -v ON_ERROR_STOP=1 -c '\copy (SELECT id, "expiresAt" FROM exam_attempts ORDER BY id) TO expires_backup.csv CSV'
```

روی دیتابیس مقصد (یک تراکنش):

```sql
BEGIN;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
CREATE TEMP TABLE bk(id text, "expiresAt" timestamp(3));
\copy bk FROM 'expires_backup.csv' CSV
UPDATE "exam_attempts" t SET "expiresAt" = bk."expiresAt" FROM bk WHERE t.id = bk.id AND t."expiresAt" IS NULL;
SELECT count(*) AS still_null FROM "exam_attempts" WHERE "expiresAt" IS NULL;   -- باید 0 باشد، وگرنه ROLLBACK و مقدار واقعی را تأمین کنید
COMMIT;
```

بعد گام ۰ را دوباره بزنید؛ باید `S_PARTIAL_EXPIRES_NULLABLE` یا `S_FINAL` دیده شود و مسیر مربوط (۵/۶) را بروید.

## مسیر ۷: checksum متفاوت برای `191557`

حالت‌ها (هر محیط را جدا ببینید):

| گروه | وضعیت محیط |
|---|---|
| G1 | نسخه‌ی **قدیمی** `191557` موفق اجرا شده (فقط روی جدول خالی ممکن بود) |
| G2 | نسخه‌ی **اصلاح‌شده‌ی فعلی** اجرا شده |
| G3 | نسخه‌ی قدیمی روی جدول دارای داده **شکست خورده** (ساختار `S_REVERTED`، ردیف FAILED) |
| G4 | هنوز اجرا نشده (pending) یا نصب تازه |

### الف) پیدا کردن نسخه‌ی دقیق اجراشده از تاریخچه‌ی Git

باید روی **کلون واقعی** (دارای `.git`) اجرا شود؛ zip این بسته تاریخچه ندارد. checksum ثبت‌شده را از ردیف `191557` گام ۰ بردارید و جایگزین `RECORDED` کنید. Bash / Git Bash (از ریشه‌ی مخزن):

```bash
F=server/prisma/migrations/20260914191557_add_exam_attempt_unique_constraint/migration.sql
RECORDED=<checksum ستون checksum از خروجی تشخیص>
git log --format=%H --follow -- "$F" | while read c; do
  lf=$(git show "$c:$F" | perl -pe 's/\r?\n/\n/' | sha256sum | cut -d' ' -f1)
  crlf=$(git show "$c:$F" | perl -pe 's/\r?\n/\r\n/' | sha256sum | cut -d' ' -f1)
  raw=$(git show "$c:$F" | sha256sum | cut -d' ' -f1)
  for h in "$raw" "$lf" "$crlf"; do [ "$h" = "$RECORDED" ] && echo "MATCH commit=$c"; done
done
```

اگر `MATCH` دیدید، فایل دقیق را بیرون بکشید و مقدار sha256 آن را دوباره با `RECORDED` بسنجید:

```bash
git show <commit>:"$F" > old_191557_migration.sql
sha256sum old_191557_migration.sql
```

اگر هیچ commitی مطابقت نداشت: نسخه‌ی اجراشده در این تاریخچه نیست (مثلاً ویرایش محلی commit‌نشده). متوقف شوید و نسخه‌ی فرضی نسازید. (برای دسترسی به بایت‌های دقیق در PowerShell از Git Bash استفاده کنید؛ pipeline PowerShell متن را بازنویسی می‌کند.)

### ب) تصمیم و اثر هر مسیر

| مسیر | G1 | G2 | G3 | G4 / تازه |
|---|---|---|---|---|
| **۱) فایل فعلی بماند** | checksum ناهمخوان می‌ماند | سالم | مسیر ۵ | `deploy` معمولی |
| **۲) فایل به نسخه‌ی قدیمی برگردد** | سالم | ناهمخوان (جهت عکس) | SQL دستی + `resolve --applied` | SQL دستی + `resolve --applied` (دیتابیس دارای داده)؛ نصب تازه‌ی خالی بدون نیاز |

هیچ مسیری `_prisma_migrations` را دستی تغییر نمی‌دهد و Prisma دستوری برای بازنویسی checksum ندارد. پس ناهمخوانی در گروه ناسازگار با فایل مخزن فقط با «همسان‌کردن فایل با تاریخچه‌ی آن محیط» یا پذیرفتن رفتار Prisma حل می‌شود. این رفتار باید با اجرای سناریوی E ثبت شود (کد خروج هر دستور برای ترکیب‌های قدیمی/فعلی و LF/CRLF):

| ترکیب (DB ↔ مخزن) | `migrate deploy` | `migrate status` | `migrate dev` (غیرتعاملی) |
|---|---|---|---|
| قدیمی ↔ فعلی (E1) | exit 0، بدون هشدار | exit 0، «up to date» | exit 1: خطای «non-interactive» (یعنی درخواست تأیید/reset) |
| فعلی ↔ قدیمی (E2) | exit 0 | exit 0 | exit 1 (همان) |
| LF ↔ CRLF (E3) | در اجرای اول نامعتبر بود (فایل از قبل CRLF بود)؛ بعد از اصلاح اسکریپت دوباره اجرا شود | | |

نتیجه‌ی مشاهده‌شده: Prisma 5.22 فایل را بایت خام hash می‌کند (سناریوی A) و `deploy`/`status` اختلاف checksum را نمی‌بینند. `migrate dev` در حالت بدون اختلاف (E3 قدیمی) موفق شد و در حالت اختلاف (E1، E2) خطای non-interactive داد؛ این به‌شدت نشان می‌دهد `dev` اختلاف را می‌بیند و reset می‌خواهد، ولی متن مستقیم «checksum» دیده نشد (استنباط است). چون checkout ویندوز CRLF است (checksum `aef613…`) و checkout لینوکس LF (`430826…`)، همین فایل در دو سیستم دو checksum دارد.

**جمع‌بندی بر پایه‌ی رفتار مشاهده‌شده:** چون `deploy` و `status` اختلاف را نمی‌بینند، برای محیط‌هایی که فقط `deploy` می‌زنند (مثل CI و production) مسیر ۱ (فایل فعلی بماند، بدون دست‌زدن به `_prisma_migrations`) کافی و کم‌خطرتر است. اختلاف فقط روی `migrate dev` همان دیتابیس‌های G1 اثر دارد. مسیر ۲ فقط وقتی لازم است که بخواهید `migrate dev` روی دیتابیس دارای نسخه‌ی قدیمی بدون reset کار کند. این نتیجه فقط برای Prisma 5.22.0 است. `migrate reset` برای هیچ دیتابیس موجودی راهکار نیست؛ اگر دیتابیس توسعه‌ی قابل‌دورریختنی دارید، آن تصمیم خارج از این بسته و با خودتان است.

### ج) مسیر ۲ برای محیط‌های دیگر: SQL و ترتیب دقیق

فقط وقتی فایل `191557` در مخزن به نسخه‌ی قدیمی (بند الف) برگردانده شده و محیط دارای داده است. نسخه‌ی قدیمی روی داده شکست می‌خورد، پس اثر نهایی را `01_manual_backfill_191557.sql` (تراکنشی، بدون حذف، بدون جعل زمان، با توقف روی خالی یا تکراری، با بررسی یکتا و معتبر بودن ایندکس) می‌سازد. ترتیب برای G3 و دیتابیس دارای داده‌ی G4:

```bash
# 0) پشتیبان؛ گام ۰ باید S_REVERTED (یا نیمه‌کاره‌ی قابل‌تکرار) و بدون ردیف تکراری نشان دهد
psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -f prisma/recovery/01_manual_backfill_191557.sql
psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -f prisma/recovery/00_diagnose_readonly.sql   # باید state=S_FINAL
npx prisma migrate resolve --applied 20260914191557_add_exam_attempt_unique_constraint
npx prisma migrate deploy
```

```powershell
psql $env:PSQL_URL -X -v ON_ERROR_STOP=1 -f prisma\recovery\01_manual_backfill_191557.sql
psql $env:PSQL_URL -X -v ON_ERROR_STOP=1 -f prisma\recovery\00_diagnose_readonly.sql
npx prisma migrate resolve --applied 20260914191557_add_exam_attempt_unique_constraint
npx prisma migrate deploy
```

برای G3 اگر ردیف FAILED در تاریخچه هست، `resolve --applied` همان ردیف را «اجراشده» می‌کند. این ترتیب در سناریوهای D2 و D3 با نسخه‌ی قدیمی (واقعی با `ORIG_191_SQL`، وگرنه شبیه‌سازی‌شده) آزموده می‌شود. این مسیر نسخه‌ی قدیمی را به مخزن برمی‌گرداند؛ این کار را فقط پس از پیدا کردن نسخه‌ی دقیق و با هماهنگی تیم انجام دهید.

## بررسی نهایی (بعد از هر مسیر)

```bash
psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 -f prisma/recovery/00_diagnose_readonly.sql
npx prisma migrate status
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

```powershell
psql $env:PSQL_URL -X -v ON_ERROR_STOP=1 -f prisma\recovery\00_diagnose_readonly.sql
npx prisma migrate status
npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code
```

انتظار: `state=S_FINAL`، `path=NONE_UP_TO_DATE`، بدون migration شکست‌خورده، `migrate status` بدون مورد معلق، `migrate diff` با کد خروج ۰ (بدون تفاوت)، `in_progress` برابر مقدار قبل از اجرا. `migrate diff` کل schema را می‌سنجد (هدر `schema.prisma` می‌گوید آن فایل از روی migrationها بازسازی شده).

## اجرای تست روی PostgreSQL آزمایشی

Bash / Git Bash (از هر پوشه):

```bash
PG_BASE_URL='postgresql://examuser:exampass@localhost:5432' bash server/prisma/recovery/test-migration-paths.sh
# با نسخه‌ی دقیق اجراشده‌ی 191557 (بند الف مسیر ۷):
ORIG_191_SQL=/path/to/old_191557_migration.sql PG_BASE_URL='postgresql://examuser:exampass@localhost:5432' bash server/prisma/recovery/test-migration-paths.sh
```

PowerShell (Git Bash را صدا می‌زند؛ متغیرهای محیطی به آن می‌رسند):

```powershell
docker compose up -d postgres
$env:PG_BASE_URL = 'postgresql://examuser:exampass@localhost:5432'
& "C:\Program Files\Git\bin\bash.exe" server/prisma/recovery/test-migration-paths.sh
```

اسکریپت فقط دیتابیس‌های `migtest_*` را می‌سازد و حذف می‌کند، به `DATABASE_URL` دست نمی‌زند و سرور غیرمحلی را رد می‌کند. خروجی پایانی: خلاصه‌ی PASS/FAIL هر سناریو، ماتریس سناریوی E و `PASS=n FAIL=m`. سناریوها: A نصب تازه، B مسیر ۳ با assert برابری داده، Bc کنترل خطر deploy ساده، C شکست `175323` و فرض rollback، D مسیر ۵، D2/D3 مسیر ۲ با SQL دستی، E رفتار checksum، F باقی‌مانده‌ی جزئی شبیه‌سازی‌شده، G فرض rollback روی `191557`، H تشخیص جدول‌های ناموجود و ایندکس هم‌نامِ نامعتبر.

## بکاپ دیتابیس و Git

فایل `backup_before_migration.dump` در این بسته هست و محتوایش بررسی/چاپ نشده است. `.gitignore` حالا `*.dump`، `*.dump.*`، `*.backup`، `*.bak`، `backup_*` و `pg_dump*` را نادیده می‌گیرد (`*.sql` عمداً نه: migrationهای Prisma همین پسوند را دارند). `.gitignore` روی فایلِ از قبل tracked اثری ندارد؛ باید از index خارج شود (نسخه‌ی محلی می‌ماند):

```bash
git ls-files --error-unmatch backup_before_migration.dump   # اگر tracked است نام را چاپ می‌کند
git rm --cached backup_before_migration.dump
git add .gitignore .gitattributes
git status                                                  # فایل باید «deleted» (در index) و «untracked نیست/ignored» باشد
git check-ignore -v backup_before_migration.dump
git commit -m "Stop tracking local DB backup; ignore local backups"
```

(PowerShell: همین دستورها بدون تغییر.) این commit فایل را فقط از نسخه‌های بعدی خارج می‌کند؛ **از تاریخچه‌ی قبلی، کلون‌ها و forkها حذف نمی‌شود.** اگر احتمال دادهٔ واقعی (کاربر، تلفن، ایمیل، هش رمز) در آن هست، آن را «افشاشده» فرض کنید: رمزها/توکن‌های مرتبط را عوض کنید و تصمیم درباره‌ی پاک‌سازی تاریخچه (`git filter-repo` یا BFG و سپس force push) را فقط بعد از هماهنگی با همه‌ی کسانی که کلون دارند بگیرید؛ این بسته تاریخچه را بازنویسی نمی‌کند و force push نمی‌زند.
