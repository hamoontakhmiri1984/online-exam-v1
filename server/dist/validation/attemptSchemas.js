"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autosaveAnswersSchema = exports.finishAttemptSchema = void 0;
const zod_1 = require("zod");
const answersShape = zod_1.z.record(zod_1.z.string(), zod_1.z.number().int().min(0));
// برای شروع attempt هیچ بدنه‌ای از کلاینت لازم نیست...
exports.finishAttemptSchema = zod_1.z.object({ answers: answersShape });
// autosave وسط آزمون - همون شکل finish، ولی سمت سرور نمره‌ای حساب نمی‌شه.
// revision: شماره‌ی نسخه‌ی این ذخیره؛ کلاینت با هر ذخیره‌ی جدید یکی بالاتر
// می‌فرسته و سرور فقط نسخه‌ای رو می‌پذیره که از نسخه‌ی ذخیره‌شده بزرگ‌تر باشه
// (تا درخواستِ قدیمی که دیرتر می‌رسه، جواب جدیدتر رو بازنویسی نکنه)
exports.autosaveAnswersSchema = zod_1.z.object({
    answers: answersShape,
    revision: zod_1.z.number().int().min(1).max(2_147_483_647),
});
