import { useCallback, useState } from 'react';

import type { CaptchaAnswer } from '../api/authApi';

// Show OTP captcha only after the server requests it for this IP.
export function useOtpCaptcha() {
  const [required, setRequired] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  // Refresh the one-use captcha after every send attempt.
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

    ready: !required || captcha !== null,
  };
}
