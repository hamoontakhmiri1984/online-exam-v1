// در CI متغیر REQUIRE_SERVICES=1 ست می‌شه: نبودِ Postgres/Redis باید تست رو
// fail کنه، نه این‌که بی‌صدا skip بشه و CI سبز بمونه. روی سیستم توسعه‌دهنده
// (بدون این متغیر) رفتار قبلی می‌مونه: تست skip می‌شه.
export function unavailable(
  t: { skip: (message?: string) => void },
  message: string
): void {
  if (process.env.REQUIRE_SERVICES === '1') {
    throw new Error(`${message} (REQUIRE_SERVICES=1: skip مجاز نیست)`);
  }
  t.skip(message);
}