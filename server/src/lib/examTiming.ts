// فرصت اضافه بعد از پایان زمان برای ارسال جواب‌ها (تأخیر شبکه). بعد از این
// مدت، جواب‌های ارسالی کلاینت نادیده گرفته می‌شن و فقط جواب‌های autosave‌شده
// (تا همین مهلت) حساب می‌شن
export const FINISH_GRACE_MS = 30_000;

type ExamWindow = {
  scheduledAt: Date;
  durationMinutes: number;
};

// پایان «عمومی» آزمون: آخرین لحظه‌ای که هر دانشجویی می‌تونه توش attempt جدید
// بسازه. expiresAt همه‌ی attempt‌ها (بدون استثنا) از این لحظه دیرتر نمی‌شه،
// چون POST /attempts/start اون رو min(now + duration, windowEnd) می‌ذاره
export function getExamWindowEndMs(exam: ExamWindow): number {
  return exam.scheduledAt.getTime() + exam.durationMinutes * 60_000;
}

// پاسخنامه (جواب صحیح سوال‌ها) فقط وقتی به دانشجو داده می‌شه که:
//   ۱) آزمون اجازه‌ی مرور داشته باشه (allowReview)
//   ۲) پایان عمومیِ آزمون + مهلت ارسال گذشته باشه
// وگرنه دانشجویی که زودتر ثبت نهایی کرده می‌تونست پاسخنامه رو برداره و برای
// دانشجوهایی که هنوز وسط آزمون‌ان بفرسته. شرطِ «attempt خودِ دانشجو تموم
// شده» جداگونه (تو route) چک می‌شه
export function isAnswerKeyReleased(
  exam: ExamWindow & { allowReview: boolean },
  nowMs: number = Date.now()
): boolean {
  if (!exam.allowReview) return false;
  return nowMs >= getExamWindowEndMs(exam) + FINISH_GRACE_MS;
}
