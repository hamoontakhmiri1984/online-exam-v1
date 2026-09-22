import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { notFound } from './errors';

type Tx = Prisma.TransactionClient;

// «قفل مشترک» بین شروع آزمون و هر تغییری که بعد از شروع ممنوعه (ویرایش/حذف/
// افزودن سوال، تغییر زمان/مدت/گروه‌ها، لغو انتشار). قبلاً هر route اول تعداد
// attempt ها رو می‌خوند و بعد جداگانه تغییر رو می‌نوشت؛ اگه دانشجو دقیقاً بین
// این دو مرحله start می‌زد، سوال/جواب صحیح بعد از شروع عوض می‌شد.
//
// الان هر دو طرف روی *همون ردیفِ Exam* در Postgres قفل می‌گیرن:
//   - تغییردهنده‌ها: FOR UPDATE  (با هر قفل دیگه‌ای تداخل داره)
//   - شروع‌کننده‌ها: FOR SHARE   (چند دانشجو هم‌زمان start می‌زنن و منتظر
//     هم نمی‌مونن، ولی با تغییردهنده‌ها هم‌زمان اجرا نمی‌شن)
// نتیجه: یا تغییر کامل قبل از start commit می‌شه (و start نسخه‌ی جدید رو
// می‌بینه)، یا start اول commit می‌شه و تغییردهنده بعد از گرفتن قفل، attempt
// رو می‌بینه و رد می‌شه. (سطح ایزولاسیون پیش‌فرض Postgres، READ COMMITTED،
// بعد از گرفتن قفل آخرین داده‌ی commit شده رو می‌خونه.)

export type LockedExamRow = {
  id: string;
  status: 'Draft' | 'Published';
  scheduledAt: Date;
  durationMinutes: number;
};

// ردیف آزمون رو با قفل مشترک می‌خونه و *همون مقدارهای بعد از قفل* رو برمی‌گردونه
// (status/زمان/مدت) - چون تا قبل از گرفتن قفل ممکنه یه ویرایش/لغو انتشار
// commit شده باشه و مقدارهای خوانده‌شده‌ی قبلی کهنه باشن
export async function lockExamForShare(
  tx: Tx,
  examId: string
): Promise<LockedExamRow> {
  const rows = await tx.$queryRaw<LockedExamRow[]>`
    SELECT "id", "status", "scheduledAt", "durationMinutes"
    FROM "exams" WHERE "id" = ${examId} FOR SHARE
  `;
  if (rows.length === 0) throw notFound('آزمون یافت نشد');
  return rows[0];
}

export async function lockExamForUpdate(
  tx: Tx,
  examId: string
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "exams" WHERE "id" = ${examId} FOR UPDATE
  `;
  if (rows.length === 0) throw notFound('آزمون یافت نشد');
}

// داخل یه تراکنش، ردیف آزمون رو قفل می‌کنه، تعداد attempt ها رو *بعد از قفل*
// می‌شمره و به run می‌ده. هر قاعده‌ی «بعد از شروع قابل‌تغییر نیست» باید همین‌جا
// (نه قبل از تراکنش) چک بشه
//
// beforeExamLock: کاری که باید *قبل از* قفل آزمون تو همین تراکنش انجام بشه
// (چکِ اتمیکِ سهمیه‌ی پلن - lib/quota.ts prepareQuotaGuard؛ اون قفلِ ردیفِ
// مدرس رو می‌گیره). ترتیب قفل‌ها تو کل پروژه «مدرس ← آزمون» ـه و هیچ
// مسیری آزمون رو قبل از مدرس قفل نمی‌کنه، پس deadlock پیش نمی‌آد.
export async function withExamWriteLock<T>(
  examId: string,
  run: (tx: Tx, ctx: { attemptCount: number }) => Promise<T>,
  opts: { beforeExamLock?: (tx: Tx) => Promise<void> } = {}
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await opts.beforeExamLock?.(tx);
    await lockExamForUpdate(tx, examId);
    const attemptCount = await tx.examAttempt.count({ where: { examId } });
    return run(tx, { attemptCount });
  });
}
