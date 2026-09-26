"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockInstructorForUpdate = lockInstructorForUpdate;
const errors_1 = require("./errors");
// قفل هر مدرس روی «ردیف خودش» تو جدول users. هر کاری که «وضعیتِ فعلیِ
// اشتراکِ یه مدرس» رو می‌خونه و بر اساسش ردیف جدید می‌نویسه (تسویه‌ی پرداخت،
// استرداد) باید اول این قفل رو بگیره، وگرنه دو تراکنش هم‌زمان هر دو «اشتراک
// فعلی» یکسان رو می‌خونن و یکی از تمدیدها گم می‌شه (lost update).
//
// چرا FOR NO KEY UPDATE و نه FOR UPDATE: با خودش و با FOR UPDATE/SHARE تداخل
// داره (پس تسویه‌های هم‌زمانِ یه مدرس نوبتی می‌شن) ولی با FOR KEY SHARE که
// Postgres برای چک کلید خارجیِ insert ـهای subscriptions/payments/groups
// می‌گیره تداخل نداره - یعنی بقیه‌ی نوشتن‌های مرتبط با این مدرس بی‌دلیل
// منتظر نمی‌مونن.
//
// ترتیب قفل‌ها همه‌جا یکسانه (اول مدرس، بعد Payment) تا deadlock پیش نیاد.
async function lockInstructorForUpdate(tx, instructorId) {
    const rows = await tx.$queryRaw `
    SELECT "id" FROM "users" WHERE "id" = ${instructorId} FOR NO KEY UPDATE
  `;
    if (rows.length === 0)
        throw (0, errors_1.notFound)('مدرس یافت نشد');
}
