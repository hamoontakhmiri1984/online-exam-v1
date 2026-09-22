import type { Prisma } from '@prisma/client';
import { notFound } from './errors';

type Tx = Prisma.TransactionClient;

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
export async function lockInstructorForUpdate(
  tx: Tx,
  instructorId: string
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "users" WHERE "id" = ${instructorId} FOR NO KEY UPDATE
  `;
  if (rows.length === 0) throw notFound('مدرس یافت نشد');
}
