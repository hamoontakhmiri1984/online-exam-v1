import { useCallback, useState } from 'react';

import type { CaptchaAnswer } from '../api/authApi';

// وضعیت کپچای «ارسال OTP» (ثبت‌نام، ورود با کد، ارسال مجدد).
// سرور فقط از یه سقفی به بعد (per-IP) کپچا می‌خواد و با
// { captchaRequired: true } خبر می‌ده؛ تا اون موقع هیچ کپچایی نشون داده نمی‌شه.
export function useOtpCaptcha() {
  const [required, setRequired] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  // بعد از هر درخواستِ ارسال OTP صدا بزن (موفق یا ناموفق).
  // کپچا یک‌بارمصرفه، پس اگه از قبل نشونش می‌دادیم چالش جدید می‌گیریم؛
  // اگه تازه لازم شده، خودِ کامپوننت Captcha موقع mount چالش می‌گیره.
  const afterRequest = useCallback(
    (result: { status: string; captchaRequired?: boolean }) => {
      if (result.status === 'error' && result.captchaRequired) {
        setRequired(true);
      }

      if (required) {
        setCaptcha(null);
        setResetSignal((current) => current + 1);
      }
    },
    [required],
  );

  return {
    required,
    captcha,
    setCaptcha,
    resetSignal,
    afterRequest,
    // true یعنی می‌شه درخواست فرستاد
    ready: !required || captcha !== null,
  };
}
