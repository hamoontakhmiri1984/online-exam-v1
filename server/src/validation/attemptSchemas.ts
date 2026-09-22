import { z } from 'zod';

const answersShape = z.record(z.string(), z.number().int().min(0));

// برای شروع attempt هیچ بدنه‌ای از کلاینت لازم نیست...
export const finishAttemptSchema = z.object({ answers: answersShape });

// autosave وسط آزمون - همون شکل finish، ولی سمت سرور نمره‌ای حساب نمی‌شه.
// revision: شماره‌ی نسخه‌ی این ذخیره؛ کلاینت با هر ذخیره‌ی جدید یکی بالاتر
// می‌فرسته و سرور فقط نسخه‌ای رو می‌پذیره که از نسخه‌ی ذخیره‌شده بزرگ‌تر باشه
// (تا درخواستِ قدیمی که دیرتر می‌رسه، جواب جدیدتر رو بازنویسی نکنه)
export const autosaveAnswersSchema = z.object({
  answers: answersShape,
  revision: z.number().int().min(1).max(2_147_483_647),
});
