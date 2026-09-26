"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINISH_GRACE_MS = void 0;
exports.getExamWindowEndMs = getExamWindowEndMs;
exports.isAnswerKeyReleased = isAnswerKeyReleased;
// فرصت اضافه بعد از پایان زمان برای ارسال جواب‌ها (تأخیر شبکه). بعد از این
// مدت، جواب‌های ارسالی کلاینت نادیده گرفته می‌شن و فقط جواب‌های autosave‌شده
// (تا همین مهلت) حساب می‌شن
exports.FINISH_GRACE_MS = 30_000;
// پایان «عمومی» آزمون: آخرین لحظه‌ای که هر دانشجویی می‌تونه توش attempt جدید
// بسازه. expiresAt همه‌ی attempt‌ها (بدون استثنا) از این لحظه دیرتر نمی‌شه،
// چون POST /attempts/start اون رو min(now + duration, windowEnd) می‌ذاره
function getExamWindowEndMs(exam) {
    return exam.scheduledAt.getTime() + exam.durationMinutes * 60_000;
}
// پاسخنامه (جواب صحیح سوال‌ها) فقط وقتی به دانشجو داده می‌شه که:
//   ۱) آزمون اجازه‌ی مرور داشته باشه (allowReview)
//   ۲) پایان عمومیِ آزمون + مهلت ارسال گذشته باشه
// وگرنه دانشجویی که زودتر ثبت نهایی کرده می‌تونست پاسخنامه رو برداره و برای
// دانشجوهایی که هنوز وسط آزمون‌ان بفرسته. شرطِ «attempt خودِ دانشجو تموم
// شده» جداگونه (تو route) چک می‌شه
function isAnswerKeyReleased(exam, nowMs = Date.now()) {
    if (!exam.allowReview)
        return false;
    return nowMs >= getExamWindowEndMs(exam) + exports.FINISH_GRACE_MS;
}
