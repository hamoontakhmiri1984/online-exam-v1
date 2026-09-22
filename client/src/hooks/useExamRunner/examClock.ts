// هم‌ترازی تایمر آزمون با ساعت سرور.
//
// expiresAt رو سرور می‌سازه، ولی تایمر قبلاً «expiresAt - Date.now()» حساب
// می‌کرد؛ یعنی روی ساعتِ دستگاه دانشجو. دستگاهی که چند دقیقه عقبه، وقتِ
// اضافه نشون می‌داد و دانشجو بعد از expiresAt + مهلتِ ارسال (FINISH_GRACE_MS
// سمت سرور) جواب می‌فرستاد و جواب‌هاش دور ریخته می‌شد؛ دستگاهِ جلو هم وقتِ
// دانشجو رو بی‌دلیل کم نشون می‌داد.
//
// راه‌حل: موقع پاسخِ start ساعتِ سرور (serverNow) هم میاد. اختلاف ساعت رو با
// نقطه‌ی وسطِ زمانِ رفت‌وبرگشتِ درخواست تخمین می‌زنیم (تأخیرِ شبکه رو تقریباً
// نصف‌نصف می‌کنه) و «موعدِ پایان» رو یک‌بار به ساعتِ محلیِ همین دستگاه
// برمی‌گردونیم. بعدش تایمر فقط (deadlineLocalMs - Date.now()) رو نشون می‌ده.

export type ClockSample = {
  expiresAt: string;
  serverNow: string;
  // Date.now() محلی، درست قبل از فرستادن و درست بعد از دریافت پاسخ
  requestStartedAtMs: number;
  responseReceivedAtMs: number;
};

// موعدِ پایان به میلی‌ثانیه روی ساعتِ محلیِ دستگاه. اگه serverNow یا
// expiresAt نامعتبر بود null برمی‌گردونه تا فراخواننده به رفتار قبلی برگرده
export function computeDeadlineLocalMs(sample: ClockSample): number | null {
  const expiresMs = Date.parse(sample.expiresAt);
  const serverMs = Date.parse(sample.serverNow);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(serverMs)) return null;

  const { requestStartedAtMs, responseReceivedAtMs } = sample;
  // ساعتِ محلی وسطِ درخواست جابه‌جا شده (یا ورودی نامعتبره) - نمونه قابل‌اعتماد نیست
  if (responseReceivedAtMs < requestStartedAtMs) return null;

  const localMidpointMs = (requestStartedAtMs + responseReceivedAtMs) / 2;
  const offsetMs = serverMs - localMidpointMs; // ساعت سرور - ساعت محلی
  return expiresMs - offsetMs;
}

export function remainingSecondsUntil(
  deadlineLocalMs: number,
  nowMs: number = Date.now()
): number {
  return Math.max(0, Math.round((deadlineLocalMs - nowMs) / 1000));
}
