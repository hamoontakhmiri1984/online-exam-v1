import { redis } from './redis';
import { verifyCaptcha } from './captcha';
import { AppError } from './errors';
import { durationToSeconds } from './duration';

const WINDOW = '1h';
const IP_CAPTCHA_AFTER = 5;
const IP_HARD_LIMIT = 60;
const IDENTIFIER_HARD_LIMIT = 8;

const TOO_MANY_MESSAGE =
  'تعداد درخواست کد بیش از حد مجازه. بعداً دوباره تلاش کن.';

const ipKey = (ip: string) => `otp:send:ip:${ip}`;
const identifierKey = (identifier: string) =>
  `otp:send:id:${identifier}`;

async function bump(key: string): Promise<number> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, durationToSeconds(WINDOW));
  }
  return count;
}

export type OtpSendGuardInput = {
  ip: string;
  identifier: string;
  captchaId?: string;
  captchaAnswer?: string;
};

export async function assertOtpSendAllowed(
  input: OtpSendGuardInput,
): Promise<void> {
  const ipCount = await bump(ipKey(input.ip));

  if (ipCount > IP_HARD_LIMIT) {
    throw new AppError(429, TOO_MANY_MESSAGE);
  }

  if (ipCount > IP_CAPTCHA_AFTER) {
    if (!input.captchaId || !input.captchaAnswer) {
      throw new AppError(
        400,
        'برای ادامه لازمه کد تصویر امنیتی رو هم وارد کنی',
        { captchaRequired: true },
      );
    }

    const valid = await verifyCaptcha(
      input.captchaId,
      input.captchaAnswer,
    );

    if (!valid) {
      throw new AppError(
        400,
        'کد تصویر امنیتی اشتباهه یا منقضی شده',
        { captchaRequired: true },
      );
    }
  }

  // Validate captcha before spending the target identifier's OTP allowance.
  const identifierCount = await bump(
    identifierKey(input.identifier),
  );

  if (identifierCount > IDENTIFIER_HARD_LIMIT) {
    throw new AppError(429, TOO_MANY_MESSAGE);
  }
}

// Apply the same captcha requirement to OTP verification as to issuance.
export async function assertOtpVerifyCaptcha(input: {
  ip: string;
  captchaId?: string;
  captchaAnswer?: string;
}): Promise<void> {
  const raw = await redis.get(ipKey(input.ip));
  const count = raw === null ? 0 : Number(raw);

  if (!(count > IP_CAPTCHA_AFTER)) return;

  if (!input.captchaId || !input.captchaAnswer) {
    throw new AppError(
      400,
      'برای ادامه لازمه کد تصویر امنیتی رو هم وارد کنی',
      { captchaRequired: true },
    );
  }

  const valid = await verifyCaptcha(input.captchaId, input.captchaAnswer);

  if (!valid) {
    throw new AppError(
      400,
      'کد تصویر امنیتی اشتباهه یا منقضی شده',
      { captchaRequired: true },
    );
  }
}
