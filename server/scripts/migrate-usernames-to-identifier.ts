// اسکریپت یک‌بارمصرف: username همه‌ی کاربرهای موجود رو به همون شناسه‌ای که
// باهاش ثبت‌نام کرده‌ن تبدیل می‌کنه - اگه موبایل داشته باشن، username=موبایل؛
// اگه نه (فقط ایمیل)، username=ایمیل. این دقیقاً همون منطقیه که از این به
// بعد خودِ روت /register برای ثبت‌نام‌های تازه انجام می‌ده (نگاه کن به
// routes/auth.ts)؛ این اسکریپت فقط همون رو برای رکوردهای قدیمی (که قبلاً یه
// username دستی/جدا انتخاب کرده بودن یا اصلاً username نداشتن) هم اعمال می‌کنه.
//
// امنه که چندبار اجرا بشه (idempotent) - رکوردی که username‌ش از قبل همون
// شناسه‌ی درسته رو داره، دوباره نوشته می‌شه ولی چیزی عوض نمی‌شه.
//
// اجرا:
//   npx ts-node --transpile-only scripts/migrate-usernames-to-identifier.ts
//   (یا با --dry-run برای فقط دیدن تغییرات بدون نوشتن تو دیتابیس)

import { prisma } from '../src/lib/prisma';
import { normalizeUsername } from '../src/lib/username';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      email: true,
      username: true,
      usernameNormalized: true,
    },
  });

  let updated = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const user of users) {
    // موبایل اولویت داره چون منطق /register هم دقیقاً همینه: هر کاربر با
    // نوع identifier ای که باهاش ثبت‌نام کرده (موبایل یا ایمیل) شناخته می‌شه؛
    // این دو تا عملاً همیشه mutually-exclusive ان (یا موبایل دارن یا ایمیل)
    const value = user.phone ?? user.email;

    if (!value) {
      // کاربری بدون موبایل و بدون ایمیل - رکورد ناقص/خراب، دست‌نمی‌زنیم
      console.warn(`[skip] کاربر ${user.id} نه موبایل داره نه ایمیل`);
      skipped++;
      continue;
    }

    const usernameNormalized = normalizeUsername(value);
    if (user.username === value && user.usernameNormalized) {
      unchanged++;
      continue;
    }

    console.log(
      `[${dryRun ? 'dry-run' : 'update'}] ${user.id}: "${
        user.username ?? '—'
      }" -> "${value}"`
    );

    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: value, usernameNormalized },
      });
    }
    updated++;
  }

  console.log(
    `\nتمام شد. ${updated} کاربر ${
      dryRun ? 'نیاز به آپدیت داشتن' : 'آپدیت شدن'
    }, ${unchanged} از قبل درست بودن, ${skipped} رد شدن.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
