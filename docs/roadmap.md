# نقشه‌ی راه پروژه — وضعیت فعلی

## ✅ انجام‌شده

- **Auth**: ثبت‌نام/ورود با OTP، رمز عبور و گوگل، تایید مدرس توسط SuperAdmin
- **Groups / Students**: ساخت گروه، کد عضویت، عضویت دانشجو، حذف/جداکردن دانشجو
- **Categories / Admin panel**: پیشنهاد و تایید دسته‌بندی، صف تایید مدرس‌ها
- **Lesson sessions / Handouts / Uploads**: آپلود ویدیو و جزوه به MinIO/S3، پخش با signed URL موقت
- **Questions / QuestionBanks**: بانک سوال + ایمپورت به آزمون
- **Exams / ExamAttempts**: ساخت آزمون، شرکت دانشجو، ثبت و نمایش نتیجه
- **Notifications**: اعلان شخصی + گروهی (real-time با socket، وضعیت خواندن per-user)
- **Subscriptions**: پلن‌ها، محدودیت پلن، پرداخت زرین‌پال
- **Blog / CMS**: مدیریت محتوای صفحه‌ی فرود و بلاگ
- **ریویو امنیتی ورود**: قفل رمز بر اساس «حساب + IP» (با سقف جدا برای حمله‌ی چند-IP)، شمارنده‌های اتمیک در Redis، ارسال خودکار کد OTP فقط وقتی کپچا نمایش داده نمی‌شود، هشدار `TRUST_PROXY=0` در production

## ✅ تصمیم‌های گرفته‌شده

- **`from-bank`**: ایمپورت از بانک سوال سقف سهمیه‌ی پلن را چک نمی‌کند.
- **تغییر پلن به پایین‌تر**: تا پایان دوره‌ی پلن پولی فعال مجاز نیست؛ ارتقا فوری است.
- **حذف دانشجو توسط SuperAdmin**: اگر سابقه‌ی آزمون داشته باشد رد می‌شود (۴۰۹)، soft-delete نیست.

## 🧪 باقی‌مانده

1. `npx prisma generate` و `npx prisma migrate deploy` روی هر محیط جدید
2. `npm run build` سرور و کلاینت + تست دستی سناریوهای اصلی
3. تنظیم آدرس فرستنده‌ی ایمیل OTP (`noreply@yourdomain.com` در `server/src/services/otpSender.ts`) و وریفای دامنه در Resend
4. تنظیم `TRUST_PROXY` (۱ یا بیشتر) در production پشت proxy/load balancer