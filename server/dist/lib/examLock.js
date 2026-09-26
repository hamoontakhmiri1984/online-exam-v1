"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockExamForShare = lockExamForShare;
exports.lockExamForUpdate = lockExamForUpdate;
exports.withExamWriteLock = withExamWriteLock;
const prisma_1 = require("./prisma");
const errors_1 = require("./errors");
// ردیف آزمون رو با قفل مشترک می‌خونه و *همون مقدارهای بعد از قفل* رو برمی‌گردونه
// (status/زمان/مدت) - چون تا قبل از گرفتن قفل ممکنه یه ویرایش/لغو انتشار
// commit شده باشه و مقدارهای خوانده‌شده‌ی قبلی کهنه باشن
async function lockExamForShare(tx, examId) {
    const rows = await tx.$queryRaw `
    SELECT "id", "status", "scheduledAt", "durationMinutes"
    FROM "exams" WHERE "id" = ${examId} FOR SHARE
  `;
    if (rows.length === 0)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
    return rows[0];
}
async function lockExamForUpdate(tx, examId) {
    const rows = await tx.$queryRaw `
    SELECT "id" FROM "exams" WHERE "id" = ${examId} FOR UPDATE
  `;
    if (rows.length === 0)
        throw (0, errors_1.notFound)('آزمون یافت نشد');
}
// داخل یه تراکنش، ردیف آزمون رو قفل می‌کنه، تعداد attempt ها رو *بعد از قفل*
// می‌شمره و به run می‌ده. هر قاعده‌ی «بعد از شروع قابل‌تغییر نیست» باید همین‌جا
// (نه قبل از تراکنش) چک بشه
//
// beforeExamLock: کاری که باید *قبل از* قفل آزمون تو همین تراکنش انجام بشه
// (چکِ اتمیکِ سهمیه‌ی پلن - lib/quota.ts prepareQuotaGuard؛ اون قفلِ ردیفِ
// مدرس رو می‌گیره). ترتیب قفل‌ها تو کل پروژه «مدرس ← آزمون» ـه و هیچ
// مسیری آزمون رو قبل از مدرس قفل نمی‌کنه، پس deadlock پیش نمی‌آد.
async function withExamWriteLock(examId, run, opts = {}) {
    return prisma_1.prisma.$transaction(async (tx) => {
        await opts.beforeExamLock?.(tx);
        await lockExamForUpdate(tx, examId);
        const attemptCount = await tx.examAttempt.count({ where: { examId } });
        return run(tx, { attemptCount });
    });
}
