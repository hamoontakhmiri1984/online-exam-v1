# سامانه آزمون آنلاین

React/Vite + Express/Prisma + PostgreSQL، Redis و MinIO.

## توسعه در Codespaces

📖 [راهنمای روزمرهٔ راه‌اندازی Docker، Redis، سرور و کلاینت + رفع خطاها](docs/CODESPACE-START.fa.md)

- Node.js 22، Docker Compose و ffprobe (بسته ffmpeg) لازم‌اند.
- `node scripts/setup-local.cjs` تنظیمات محلی و رمزهای تصادفی مستقل را می‌سازد؛ تنظیمات موجود دیتابیس و فضای ذخیره حفظ می‌شوند. رمز Redis در تنظیم سرور و Compose هماهنگ می‌شود.
- پورت‌های دیتابیس، Redis و MinIO فقط روی loopback میزبان منتشر می‌شوند؛ در Codespaces آن‌ها را Public نکنید.
- در Codespaces درخواست‌های API و Socket.IO از طریق Vite روی پورت 5173 به سرور محلی پورت 4000 پروکسی می‌شوند؛ در نتیجه نیازی نیست مرورگر مستقیماً به URL فورواردشدهٔ پورت 4000 وصل شود. مقادیر localhost در client/.env را نگه دارید. CORS و endpointهای نشست در حالت development فقط origin دقیق Codespace فعال را می‌پذیرند. Redis و PostgreSQL داخلی می‌مانند و پورت‌های آن‌ها را عمومی نکنید.
- Google OAuth به Client ID واقعی یکسان در کلاینت و سرور و ثبت origin در Google نیاز دارد.

```bash
node scripts/setup-local.cjs
node scripts/prepare-vendor.cjs
npm ci
docker compose -p online-exam-v1 up -d postgres redis minio minio-init
cd server
npx prisma migrate deploy
npx prisma generate
cd ..
bash scripts/start-codespace.sh
```

در ترمینال دیگری `npm run dev -w client` را اجرا کنید. اسکریپت بالا سرور را هم اجرا می‌کند؛ هم‌زمان یک سرور دوم روی 4000 اجرا نکنید.

## عملیات و امنیت

- قطع Redis عمداً مسیرهای احراز هویت و محدودکننده را با 503 متوقف می‌کند؛ محدودیت امنیتی دور زده نمی‌شود. فرمان‌های زمان قطعی صف نمی‌شوند.
- SIGINT/SIGTERM ابتدا پذیرش درخواست را متوقف می‌کند، سوکت‌ها را می‌بندد و حداکثر 10 ثانیه برای درخواست‌ها و کارهای فعال صبر می‌کند؛ سپس اتصال‌های Redis و Prisma بسته می‌شوند. رسیدن به مهلت با خروج ناموفق ثبت می‌شود.
- خطای startup شامل علت واقعی (از جمله EADDRINUSE) است. لاگ‌های برنامه از logger ساخت‌یافتهٔ مشترک عبور می‌کنند؛ لاگ query خود Prisma و خروجی ابزارهای خط فرمان مستقل‌اند.
- `/health` اتصال سرویس‌ها را می‌سنجد، نه تطابق تمام ستون‌های دیتابیس. موفق بودن آن جایگزین migration نیست.
- تغییر دستی schema را پیش از اجرای migration با تاریخچه تطبیق دهید؛ برای نسخه‌های قدیمی از [راهنمای بازیابی](server/prisma/recovery/README.fa.md) استفاده کنید.
- فرستندهٔ ایمیل را با `OTP_EMAIL_FROM` روی دامنهٔ تأییدشدهٔ Resend تنظیم کنید.
- `TRUST_PROXY` را متناسب با تعداد پروکسی‌های مورداعتماد تنظیم کنید تا IP ورود و محدودیت درخواست درست محاسبه شوند.

## Docker سرور

```bash
docker build -t online-exam-api .
```

ایمیج فقط backend است، شامل ffprobe و ابزار Prisma. تنظیمات با env زمان اجرا تزریق می‌شوند. داخل کانتینر localhost به خود کانتینر اشاره می‌کند؛ برای DATABASE_URL، REDIS_URL و S3_ENDPOINT از نام سرویس‌های شبکه Docker استفاده کنید. اجرای migration یک مرحله مستقل پیش از راه‌اندازی است (`npx prisma migrate deploy` در همین ایمیج). secrets داخل image قرار نمی‌گیرند. تنظیم production به merchant واقعی، ZARINPAL_SANDBOX=false، کلیدهای غیرپیش‌فرض S3 و CLIENT_URL امن HTTPS نیاز دارد. تصویر نهایی وابستگی توسعه ندارد و HEALTHCHECK دارد. فایل compose موجود فقط برای توسعه با رمزهای محلی است. فایل‌های کلاینت جداگانه با `npm run build -w client` ساخته و میزبانی می‌شوند.

## بررسی

```bash
node --test server/tests/operations.test.cjs server/tests/redisConnection.test.cjs
npm run build -w server
npm test -w client
npm run build -w client
npm run lint -w client
```

تست Redis واقعی با REQUIRE_SERVICES=1 و REDIS_URL قابل اجراست.

### تست‌های سرور روی دیتابیس جدا

`npm test -w server` قبل از اجرا `server/.env.test` را می‌خواند، تا تست‌ها به Postgres و Redis توسعه دست نزنند. یک‌بار آماده‌سازی:

```bash
npm run test:setup -w server   # ساخت examdb_test + migrate deploy (و Redis DB شماره 1)
npm test -w server
```

اگر `.env.test` نباشد، تست‌ها با هشدار روی همان `.env` توسعه اجرا می‌شوند. در CI متغیرها از خود workflow می‌آیند و این فایل لازم نیست.

راهنمای بررسی امنیت، migrationها و آزمون‌های جدید: [سخت‌سازی و نگهداری](docs/QUALITY-HARDENING.fa.md).

## راهنماهای قابلیت‌ها

- [میزکار کاربر ارشد و اعلان‌ها](docs/admin-workspace.fa.md)
- [قوانین تأیید مدرس و گروه](docs/approval-policy.fa.md)
- [تمرین و مرور](docs/practice.fa.md)

راهنمای [ایمیل، پایش و استقرار staging](docs/OPERATIONS.fa.md).

راهنمای امنیت، تست نصب و محدودیت‌های ارزیابی موبایل: [اعتبارسنجی امنیت](docs/SECURITY-VALIDATION.fa.md).
