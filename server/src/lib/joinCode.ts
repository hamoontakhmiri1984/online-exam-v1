import { randomInt } from 'crypto';
import { prisma } from './prisma';

// بدون حروف/عدد شبیه‌به‌هم (O/0, I/1) - دقیقاً همون الفبایی که تو mock فرانت
// (groupApi.ts) بود، برای یکسان موندن تجربه‌ی کاربر
const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const JOIN_CODE_LENGTH = 6;

function randomCode(): string {
  return Array.from({ length: JOIN_CODE_LENGTH }, () =>
    // crypto.randomInt (CSPRNG)، نه Math.random: خروجی Math.random قابل‌پیش‌بینیه
    // (state موتور V8 از چند خروجی قابل‌بازیابیه)؛ کد عضویت یه secret ـه
    JOIN_CODE_CHARS.charAt(randomInt(JOIN_CODE_CHARS.length))
  ).join('');
}

// چون joinCode تو دیتابیس unique ـه، به‌جای چک دستی، ساده‌تره چند بار تلاش
// کنیم و تصادفی بودن ۶ کاراکتر از یه الفبای ۳۲تایی عملاً برخورد نداره؛ فقط
// برای اطمینان یه سقف تلاش می‌ذاریم
export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await prisma.group.findUnique({
      where: { joinCode: code },
    });
    if (!existing) return code;
  }
  throw new Error('تولید کد عضویت یکتا ناموفق بود، دوباره تلاش کن');
}
