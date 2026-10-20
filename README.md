# سامانه آزمون آنلاین

React/Vite + Express/Prisma + PostgreSQL، Redis و MinIO.

## توسعه در Codespaces

📖 [راهنمای روزمرهٔ راه‌اندازی Docker، Redis، سرور و کلاینت + رفع خطاها](docs/CODESPACE-START.fa.md)

- Node.js 22، Docker Compose و ffprobe (بسته ffmpeg) لازم‌اند.
- فقط برای راه‌اندازی اولیه، از `server/.env.example` و `client/.env.example` کپی بسازید. فایل‌های `.env` موجود را جایگزین نکنید.
- برای دو JWT secret، دو مقدار متفاوت با `openssl rand -hex 32` بسازید.
- در Codespaces آدرس CLIENT_URL را برابر URL پورت 5173، SERVER_URL و VITE_API_BASE_URL و VITE_SOCKET_URL را برابر URL پورت 4000 بگذارید. Redis و PostgreSQL داخلی می‌مانند؛ URL فورواردشده HTTPS برای آن‌ها مناسب نیست.
- Google OAuth به Client ID واقعی یکسان در کلاینت و سرور و ثبت origin در Google نیاز دارد.

```bash
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
- اگر `avatarKey` قبلاً دستی اضافه شده است، migration مربوط را بدون بررسی تاریخچه دوباره اجرا نکنید. این بسته هیچ تغییری در دیتابیس اعمال نمی‌کند.
- فایل‌های پچ قدیمی در `docs/archive/patches` بایگانی شده‌اند؛ آن‌ها را دوباره روی نسخه جدید اعمال نکنید.

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
