import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { redis } from './redis';

// کپچای تصویری واقعی، سمت سرور تولید و تایید می‌شه (برخلاف نسخه‌ی قبلی که
// فقط یه سوال ریاضی تو خودِ کلاینت بود و هیچ‌وقت به سرور نمی‌رسید - یعنی هر
// اسکریپتی که مستقیم API رو صدا می‌زد ازش رد می‌شد بدون هیچ مانعی).
//
// به‌جای کتابخونه‌ی خارجی مثل canvas/svg-captcha (که نصبشون به اینترنت/npm
// install نیاز داره)، خودِ SVG رو دستی با کاراکترهای کج/رنگی + نویز پس‌زمینه
// می‌سازیم - از نظر بصری همون سطح یه کپچای معمولیه.

const CODE_LENGTH = 5;
const TTL_SECONDS = 5 * 60; // ۵ دقیقه فرصت برای پر کردن بقیه‌ی فرم و submit
const SALT_ROUNDS = 8; // کد کوتاه‌مدت و کم‌حساسیته؛ نیازی به SALT_ROUNDS سنگینِ پسورد نیست

// حروف/عددهای شبیه‌به‌هم (0/O, 1/l/I) حذف شدن تا کاربر سرِ خوندن کد گیج نشه
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const captchaKey = (id: string) => `captcha:${id}`;

function randomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[crypto.randomInt(CHARSET.length)];
  }
  return code;
}

function renderSvg(code: string): string {
  const width = 170;
  const height = 60;
  const charWidth = width / code.length;

  // چندتا خط رنگی نویز پشت متن - سخت‌تر کردن OCR خودکار
  const noiseLines = Array.from({ length: 4 }, () => {
    const x1 = crypto.randomInt(width);
    const y1 = crypto.randomInt(height);
    const x2 = crypto.randomInt(width);
    const y2 = crypto.randomInt(height);
    const hue = crypto.randomInt(360);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="hsl(${hue},60%,70%)" stroke-width="1.5" opacity="0.6" />`;
  }).join('');

  const noiseDots = Array.from({ length: 30 }, () => {
    const cx = crypto.randomInt(width);
    const cy = crypto.randomInt(height);
    const hue = crypto.randomInt(360);
    return `<circle cx="${cx}" cy="${cy}" r="1.2" fill="hsl(${hue},50%,60%)" opacity="0.5" />`;
  }).join('');

  const letters = code
    .split('')
    .map((ch, i) => {
      const x = charWidth * i + charWidth / 2 + (crypto.randomInt(9) - 4);
      const y = height / 2 + (crypto.randomInt(11) - 5);
      const rotate = crypto.randomInt(41) - 20; // بین -20 تا 20 درجه
      const hue = crypto.randomInt(360);
      const fontSize = 26 + crypto.randomInt(6);
      return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" fill="hsl(${hue},55%,40%)" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotate} ${x} ${y})">${ch}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="captcha"><rect width="${width}" height="${height}" fill="#f3f4f6" />${noiseLines}${noiseDots}${letters}</svg>`;
}

export async function createCaptcha(): Promise<{
  captchaId: string;
  svg: string;
}> {
  const code = randomCode(CODE_LENGTH);
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const captchaId = crypto.randomUUID();

  await redis.set(captchaKey(captchaId), codeHash, { EX: TTL_SECONDS });

  return { captchaId, svg: renderSvg(code) };
}

// یک‌بارمصرف: چه جواب درست باشه چه غلط، بلافاصله بعد از یه بار چک کلید از
// Redis پاک می‌شه - وگرنه می‌شه رو یه captchaId ثابت جواب رو brute-force کرد
export async function verifyCaptcha(
  captchaId: unknown,
  answer: unknown
): Promise<boolean> {
  if (typeof captchaId !== 'string' || typeof answer !== 'string')
    return false;

  const key = captchaKey(captchaId);
  const codeHash = await redis.get(key);
  if (!codeHash) return false;

  await redis.del(key);
  return bcrypt.compare(answer.trim().toUpperCase(), codeHash);
}
