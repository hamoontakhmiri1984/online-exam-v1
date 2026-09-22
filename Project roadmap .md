# نقشه‌ی راه پروژه — وضعیت فعلی

> این فایل قبلاً یه پلنِ «سیم‌کشیِ کلاینت به سرور» بود (فازهای Exam/Notifications/
> Subscriptions/stub-cleanup). اون پلن **تکمیل شده** — همه‌ی فایل‌های زیر دیگه
> mock نیستن و واقعاً `apiRequest` می‌زنن: `examApi.ts`, `examAttemptApi.ts`,
> `notificationApi.ts`, `subscriptionApi.ts`, `adminApi.ts` (به‌جای
> `getInstructors` قدیمی: `getInstructorsByStatus`)، `studentApi.ts` (به‌جای
> `removeUserAccount` قدیمی: `deleteStudent`). این فایل الان جایگزین شده با
> وضعیتِ واقعیِ فعلی پروژه + کارهای بازِ باقی‌مونده، هماهنگ با ریویوی فاز‌به‌فازی
> که در حال انجامشیم.

---

## ✅ انجام‌شده

- **Auth**: ثبت‌نام/ورود با OTP و گوگل، تایید مدرس توسط SuperAdmin
- **Groups / Students**: ساخت گروه، کد عضویت، عضویت دانشجو، حذف/جداکردن دانشجو
- **Categories / Admin panel**: پیشنهاد و تایید دسته‌بندی، صف تایید مدرس‌ها
- **Lesson sessions / Handouts / Uploads**: آپلود ویدیو و جزوه به MinIO/S3، پخش با signed URL موقت
- **Questions / QuestionBanks**: بانک سوال + ایمپورت به آزمون
- **Exams / ExamAttempts**: ساخت آزمون، شرکتِ دانشجو، ثبت و نمایش نتیجه
- **Notifications**: اعلان شخصی + گروهی (real-time با socket)
- **Subscriptions**: پلن‌ها، محدودیت پلن، پرداخت زرین‌پال
- **کلاینت**: تمام فایل‌های `client/src/api/*` بالا از mock به API واقعی وصل شدن

## 🔧 در حال ریویو (فاز‌به‌فاز، همین گفتگو)

| #   | بخش                                                                     | وضعیت                                                                                                                 |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ۱   | آپلود (`videoUpload.ts`, `attachmentUpload.ts`)                         | بررسی شد، بدون باگ                                                                                                    |
| ۲   | گروه/دانشجو (`groups.ts`, `students.ts`, `joinCode.ts`)                 | بررسی شد، بدون باگ                                                                                                    |
| ۳   | دسته‌بندی/ادمین (`categories.ts`, `admin.ts`)                           | باگ پیدا و **fix شد**: `POST /categories` بدون `requireRole` بود                                                      |
| ۴   | نوتیفیکیشن (`notifications.ts` ×۲)                                      | باگ پیدا و **fix شد**: وضعیتِ خوندنِ اعلانِ گروهی بینِ کاربرها مشترک بود؛ نیاز به migration جدید (`NotificationRead`) |
| ۵   | زیرساخت (`env.ts`, `docker-compose.yml`, `errorHandler.ts`, `setup.md`) | بررسی شد؛ فقط `setup.md` قدیمی بود، **fix شد**                                                                        |
| ۶   | کلاینت (باقیمانده)                                                      | در حال بررسی                                                                                                          |

## ❓ تصمیم‌های باز (نیاز به نظر تو)

1. **`from-bank`**: سوالِ ایمپورت‌شده از بانک، مصرفِ سهمیه‌ی پلن حساب نمی‌شه ولی سقف رو چک می‌کنه — مدرسِ رسیده به سقف نمی‌تونه ایمپورت کنه. برداشته بشه یا بمونه؟
2. **تغییر پلن به‌پایین‌تر** وقتی پلنِ بالاتر هنوز فعاله، فوراً جایگزینش می‌کنه. جلوش گرفته بشه یا بمونه؟
3. **`username` دانشجو** (تو `students.ts`): چون مدل `User` فیلد جدای username نداره، فعلاً `email` وگرنه `phone` وگرنه `id`. تایید؟
4. **حذف کامل دانشجو توسط SuperAdmin**: اگه سابقه‌ی امتحان داشته باشه رد می‌شه (۴۰۹)، نه soft-delete. تایید؟

## 🧪 باقی‌مونده — تست و اجرا

1. `npx prisma migrate dev --name notification_per_user_read` (به‌خاطرِ فاز ۴ بالا — لازمه چون schema عوض شد)
2. `npx prisma generate` و `npx prisma migrate deploy`
3. `npm run build` سرور و کلاینت + تست دستی طبق سناریوهای هر فاز
4. تنظیمِ آدرسِ فرستنده‌ی ایمیل OTP (`noreply@yourdomain.com` تو `otpSender.ts`)

---

## ترتیب پیشنهادی ادامه

فاز ۶ (کلاینت) → جواب به تصمیم‌های باز (۱ تا ۴) → تست و اجرا
