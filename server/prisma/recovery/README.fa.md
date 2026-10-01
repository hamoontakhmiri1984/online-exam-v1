# راهنمای migrationهای زمان‌بندی تلاش آزمون (exam_attempts)

این راهنما فقط برای این چهار migration است:

| ترتیب | migration | کاری که می‌کند |
|---|---|---|
| ۱ | `20260912133000_exam_attempt_server_timing` | ستون `expiresAt` را اضافه می‌کند، `finishedAt` را nullable می‌کند، ایندکس یکتا می‌سازد |
| ۲ | `20260912175323_add_approval_status` | همان سه تغییر را برمی‌گرداند (ستون `expiresAt` حذف، `finishedAt` الزامی، ایندکس حذف). اسم آن گمراه‌کننده است |
| ۳ | `20260914191557_add_exam_attempt_unique_constraint` | دوباره `expiresAt` و ایندکس یکتا را برمی‌گرداند (نسخه‌ی فعلی فایل اصلاح‌شده است) |
| ۴ | `20260922100000_fix_exam_attempt_timing_migration_history` | اصلاحیِ idempotent؛ اگر وضعیت درست باشد چیزی را تغییر نمی‌دهد |

حالت نهایی درست (`S_FINAL`) همان `schema.prisma` است: `expiresAt` الزامی، `finishedAt` nullable، ایندکس یکتای `(examId, studentId)`.

## قواعد ثابت

- هیچ‌کدام از فایل‌های migration اجراشده در این بسته تغییر نکرده‌اند.
- جدول `_prisma_migrations` را هرگز با `UPDATE` یا `DELETE` دستی تغییر ندهید. فقط از `prisma migrate resolve` استفاده کنید.
- از `migrate reset`، `db push --force-reset` یا حذف ردیف استفاده نکنید.
- برای تلاش ناتمام (`finishedAt` خالی) زمان پایان نسازید.
- قبل از هر مسیر روی دیتابیس واقعی: نسخه‌ی پشتیبان بگیرید و نوشتن برنامه را موقتاً متوقف کنید.

```bash
pg_dump --format=custom --file="backup_before_migration_$(date +%Y%m%d_%H%M%S).dump" "$DATABASE_URL"
```

تمام دستورها از پوشه‌ی `server` اجرا می‌شوند.

## گام ۰: تشخیص (فقط‌خواندنی)

```bash
psql "$DATABASE_URL" -X -f prisma/recovery/00_diagnose_readonly.sql
npx prisma migrate status
sha256sum prisma/migrations/20260914191557_add_exam_attempt_unique_constraint/migration.sql
```

(در macOS به‌جای `sha256sum` از `shasum -a 256` استفاده کنید.)

خروجی را با جدول زیر تطبیق دهید. اگر هیچ ردیفی مطابق نبود، متوقف شوید و دستی بررسی کنید.

| وضعیت دیتابیس | مسیر |
|---|---|
| دیتابیس خالی / نصب تازه | مسیر ۱ |
| بدون migration شکست‌خورده، و `175323` قبلاً موفق اجرا شده | مسیر ۲ |
| بدون شکست، `133000` اجرا شده ولی `175323` هنوز اجرا نشده (pending) و state برابر `S_FINAL` | مسیر ۳ |
| `175323` شکست‌خورده و state برابر `S_FINAL` | مسیر ۴ |
| `191557` شکست‌خورده و state برابر `S_REVERTED` | مسیر ۵ |
| `922100000` شکست‌خورده | مسیر ۶ |
| checksum ثبت‌شده‌ی `191557` با فایل فعلی فرق دارد | مسیر ۷ (علاوه بر مسیر مناسب بالا) |

## مسیر ۱: نصب تازه

```bash
npx prisma migrate deploy
```

بررسی بعد از اجرا: «بررسی نهایی» پایین همین فایل.

## مسیر ۲: دیتابیس موجود، بدون شکست و بدون وضعیت معلق

```bash
npx prisma migrate deploy
```

فقط migrationهای pending اجرا می‌شوند. بعد «بررسی نهایی».

## مسیر ۳: `133000` اجراشده، `175323` هنوز pending، state برابر `S_FINAL`

اگر الان `migrate deploy` بزنید، `175323` ستون `expiresAt` را حذف می‌کند و `191557` آن را از `finishedAt` پر می‌کند؛ یعنی مقدار واقعی `expiresAt` از دست می‌رود. اگر تلاش ناتمام هم باشد، `175323` شکست می‌خورد (مسیر ۴ را ببینید). چون دیتابیس همین حالا در حالت نهایی است، اثرِ خالصِ «۱۷۵۳۲۳ و بعد ۱۹۱۵۵۷» تغییری ایجاد نمی‌کند.

۱. پشتیبان بگیرید و state را `S_FINAL` ببینید.
۲. مرحله‌ی برگشتی را ثبت کنید (بدون اجرای SQL آن):

```bash
npx prisma migrate resolve --applied 20260912175323_add_approval_status
```

۳. بقیه را اجرا کنید:

```bash
npx prisma migrate deploy
```

`191557` و `922100000` روی `S_FINAL` اثری ندارند. بعد «بررسی نهایی».

## مسیر ۴: `175323` شکست‌خورده، state برابر `S_FINAL`

علت معمول: تلاش ناتمام (`finishedAt` خالی) وجود دارد و `SET NOT NULL` رد شده است. چون migration داخل یک تراکنش اجرا شده، انتظار می‌رود هیچ تغییری روی ساختار نمانده باشد؛ این را گام ۰ تأیید می‌کند (state باید `S_FINAL` باشد).

۱. پشتیبان بگیرید. تعداد `in_progress_attempts` را یادداشت کنید.
۲. مرحله‌ی برگشتی را ثبت کنید:

```bash
npx prisma migrate resolve --applied 20260912175323_add_approval_status
```

۳. ادامه:

```bash
npx prisma migrate deploy
```

۴. «بررسی نهایی» را بزنید و مطمئن شوید `in_progress_attempts` همان عدد قبل است.

نکته: برای این حالت `--rolled-back` و اجرای دوباره‌ی `175323` را انتخاب نکنید؛ دوباره شکست می‌خورد، و اگر تلاش ناتمامی نباشد، `expiresAt` واقعی را حذف می‌کند.

## مسیر ۵: `191557` شکست‌خورده، state برابر `S_REVERTED`

علت معمول: نسخه‌ی قدیمی فایل ستون `expiresAt` را الزامی و بدون default اضافه می‌کرد و روی جدول دارای داده شکست می‌خورد.

۱. پشتیبان بگیرید. بخش ۶ تشخیص (ردیف تکراری) باید «0 rows» باشد. اگر ردیف تکراری دارید، ایندکس یکتا ساخته نمی‌شود. تصمیم درباره‌ی ادغام یا حذف تکراری‌ها با خودتان است؛ این بسته هیچ ردیفی را حذف نمی‌کند.
۲. شکست را به حالت «برگشته» تبدیل کنید:

```bash
npx prisma migrate resolve --rolled-back 20260914191557_add_exam_attempt_unique_constraint
```

۳. اجرا:

```bash
npx prisma migrate deploy
```

نسخه‌ی فعلی `191557` ابتدا nullable اضافه می‌کند، از `finishedAt` پر می‌کند (همان fallback خودِ migration)، و اگر ردیفی بدون مقدار بماند با پیام واضح متوقف می‌شود.

## مسیر ۶: `922100000` شکست‌خورده

۱. متن خطا را از بخش ۳ تشخیص بخوانید. این migration فقط وقتی متوقف می‌شود که ردیفی `expiresAt` خالی داشته باشد و از `finishedAt` هم پر نشود.
۲. ردیف‌های مشکل‌دار را بررسی و مقدار درست را از منبع واقعی خودتان وارد کنید (مقدار حدسی نسازید).
۳. بعد:

```bash
npx prisma migrate resolve --rolled-back 20260922100000_fix_exam_attempt_timing_migration_history
npx prisma migrate deploy
```

## مسیر ۷: checksum متفاوت برای `191557`

این حالت فقط وقتی پیش می‌آید که نسخه‌ی قدیمی فایل (روی جدول خالی) موفق اجرا شده باشد. ساختار دیتابیس در این حالت درست است.

۱. اول فقط تفاوت انتهای خط را رد کنید. این پروژه `.gitattributes` ندارد و چند migration با CRLF ذخیره شده‌اند، پس checkout روی ویندوز می‌تواند checksum را عوض کند:

```bash
F=prisma/migrations/20260914191557_add_exam_attempt_unique_constraint/migration.sql
sha256sum "$F"
sed 's/$/\r/' "$F" | sha256sum
```

۲. اگر هیچ‌کدام با ستون `checksum` برابر نبود، نسخه‌ی اجراشده را در تاریخچه‌ی git پیدا کنید:

```bash
F=server/prisma/migrations/20260914191557_add_exam_attempt_unique_constraint/migration.sql
git log --format=%H --follow -- "$F" | while read c; do
  printf '%s %s\n' "$c" "$(git show "$c:$F" | sha256sum | cut -d' ' -f1)"
done
```

۳. تصمیم:
- Prisma دستوری برای بازنویسی checksum ندارد و `migrate resolve` فقط وضعیت شکست‌خورده را عوض می‌کند. بازنویسی دستی `_prisma_migrations` ممنوع است.
- رفتار واقعی `migrate deploy` و `migrate status` با checksum متفاوت را روی نسخه‌ی Prisma پروژه با سناریوی E در `test-migration-paths.sh` ببینید و نتیجه را مبنای تصمیم قرار دهید.
- اگر می‌خواهید تاریخچه و فایل در همه‌ی محیط‌ها یکی باشد، فایل را به نسخه‌ی دقیق اجراشده (commit پیدا شده در گام ۲) برگردانید و اصلاح را فقط در migration جدید و مسیر دستی مسیر ۵ نگه دارید. این کار برای محیط‌هایی که روی نسخه‌ی قدیمی شکست خورده‌اند به اجرای دستی نیاز دارد.
- روی دیتابیس توسعه (نه واقعی) خطای `migrate dev` را می‌توان با reset همان دیتابیس توسعه برطرف کرد.

## بررسی نهایی (بعد از هر مسیر)

```bash
psql "$DATABASE_URL" -X -f prisma/recovery/00_diagnose_readonly.sql
npx prisma migrate status
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

انتظار: state برابر `S_FINAL`، بدون migration شکست‌خورده، `migrate status` بدون مورد معلق، و `migrate diff` با کد خروج ۰ (بدون تفاوت). `in_progress_attempts` باید با مقدار قبل از اجرا برابر باشد.

توجه: هدر `schema.prisma` می‌گوید فایل از روی migrationها بازسازی شده و باید با دیتابیس واقعی مقایسه شود. `migrate diff` بالا همین مقایسه است و برای کل schema اجرا می‌شود، نه فقط `exam_attempts`.

## تست روی PostgreSQL آزمایشی

```bash
PG_BASE_URL='postgresql://examuser:exampass@localhost:5432' bash prisma/recovery/test-migration-paths.sh
```

این اسکریپت فقط دیتابیس‌های `migtest_*` را می‌سازد و حذف می‌کند و به `DATABASE_URL` دست نمی‌زند.