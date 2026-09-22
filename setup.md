# راهنمای راه‌اندازی محلی (VS Code)

این فایل رو تو ریشه‌ی پروژه نگه دار. همه‌ی مراحل برای اجرای پروژه روی سیستم خودت (نه StackBlitz) هست.

## پیش‌نیازها

قبل از هر کاری این‌ها باید روی سیستمت نصب و **روشن** باشن:

- **Node.js** نسخه‌ی ۲۰ یا بالاتر (`node -v` رو چک کن)
- **PostgreSQL** (لوکال نصب‌شده، یا با Docker)
- **Redis** (لوکال نصب‌شده، یا با Docker)

اگه Docker داری، ساده‌ترین راه اینه که این دو سرویس رو باهاش بالا بیاری:

```bash
docker run -d --name exam-postgres -e POSTGRES_USER=examuser -e POSTGRES_PASSWORD=exampass -e POSTGRES_DB=examdb -p 5432:5432 postgres:16
docker run -d --name exam-redis -p 6379:6379 redis:7
```

اگه Docker نداری، Postgres و Redis رو مستقیم از سایت‌شون نصب کن و با یوزر/پسورد دلخواه یه دیتابیس بساز — فقط بعداً باید `DATABASE_URL` تو `.env` رو با همون مقادیر هماهنگ کنی.

## مرحله ۱ — نصب پکیج‌ها

تو ریشه‌ی پروژه:

```bash
npm install --workspaces
```

اگه به هر دلیلی خطا داد، جدا جدا نصب کن:

```bash
cd server && npm install
cd ../client && npm install
```

## مرحله ۲ — تنظیم `.env` سرور

فایل `server/.env` از قبل هست، فقط این مقادیر رو با محیط خودت چک/عوض کن:

- `DATABASE_URL` — باید با یوزر/پسورد/پورت Postgresی که بالا آوردی یکی باشه
- `REDIS_URL` — اگه Redis رو با پورت پیش‌فرض (6379) بالا آوردی نیازی به تغییر نیست
- `GOOGLE_CLIENT_ID` — الان placeholder ـه؛ اگه فعلاً نمی‌خوای ورود با گوگل رو تست کنی، هر مقدار غیرخالی توش بذار تا zod schema خطا نده (خودِ فیچر گوگل تا وقتی واقعی صداش نزنی مشکلی درست نمی‌کنه)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — همینا که هست برای تست محلی کافیه

`KAVENEGAR_API_KEY` و `RESEND_API_KEY` رو خالی بذار — تا وقتی خالی‌ان، کد OTP به‌جای ارسال واقعی تو کنسول سرور لاگ می‌شه (برای تست کافیه).

`ZARINPAL_MERCHANT_ID` / `ZARINPAL_SANDBOX` / `SERVER_URL` — برای تست پرداخت پلن‌های پولی. با مقدار پیش‌فرض (sandbox=true) نیازی به merchant واقعی نیست، فقط باید بعد از انتخاب پلن پولی تو `/plans`، تو صفحه‌ی sandbox زرین‌پال یه شماره کارت تستی وارد کنی (تو مستندات sandbox زرین‌پال هست). وقتی merchant واقعی از پنل زرین‌پال گرفتی، `ZARINPAL_MERCHANT_ID` رو باهاش عوض کن و `ZARINPAL_SANDBOX=false` بذار.

## مرحله ۳ — ساخت جدول‌های دیتابیس (Prisma)

```bash
cd server
npx prisma generate
npx prisma migrate dev
```

اگه دستور بالا موفق بود، جدول‌های `users`, `otp_codes` و... تو دیتابیست ساخته می‌شن.

## مرحله ۴ — بالا آوردن سرورها

دو ترمینال جدا باز کن:

```bash
# ترمینال ۱ - بک‌اند (پورت 4000)
cd server
npm run dev
```

```bash
# ترمینال ۲ - فرانت (پورت 5173)
cd client
npm run dev
```

سرور که بالا اومد، `http://localhost:4000/health` باید `{"status":"ok"}` برگردونه — یعنی هم به Postgres هم به Redis وصل شده.

## چک لیست عیب‌یابی سریع

- خطای اتصال به دیتابیس → مقدار `DATABASE_URL` رو با یوزر/پسورد/پورت واقعی Postgres چک کن
- خطای اتصال به Redis → مطمئن شو کانتینر/سرویس Redis روشنه (`docker ps` یا `redis-cli ping`)
- خطای zod روی `env.ts` موقع بالا اومدن سرور → یعنی یکی از فیلدهای اجباریِ `.env` خالیه یا کوتاه‌تر از حد مجازه (مثلاً secretها باید حداقل ۳۲ کاراکتر باشن)

## وضعیت فعلی بک‌اند

برخلافِ نسخه‌های قبلیِ این راهنما، بک‌اند دیگه فقط auth نیست. این بخش‌ها از قبل پیاده‌ن (تو `server/src/routes/`):

- `auth` — ثبت‌نام/ورود (OTP، گوگل)، تایید مدرس
- `groups`, `students`, `lib/joinCode` — گروه، عضویت با کد
- `categories`, `admin` — دسته‌بندی و پنل SuperAdmin
- `lessonSessions`, `handouts`, `uploads` — جلسات، جزوه، آپلود ویدیو/PDF (به MinIO/S3)
- `questions`, `questionBanks` — بانک سوال
- `exams`, `examAttempts` — برگزاری آزمون و ثبت نتیجه
- `notifications` — اعلان شخصی/گروهی (real-time با socket)
- `subscriptions` — پلن‌ها و پرداخت زرین‌پال

اگه بخشی هنوز ناقصه یا فرانت بهش وصل نیست، اینجا لیستش نکن؛ چون همین الان هم قدیمی می‌شه - به‌جاش تو خودِ PR/issue مربوطه پیگیریش کن.
