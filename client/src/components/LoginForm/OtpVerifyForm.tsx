import { useEffect, useState, type FormEvent } from 'react';

import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

import { requestOtp, verifyOtp } from '../../api/authApi';

import { OTP_CODE_LENGTH, RESEND_COOLDOWN_SECONDS } from '../../constants/otp';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';
import { formatCountdown } from '../../utils/formatCountdown';

import Button from '../Button/Button';
import Captcha from '../Captcha/Captcha';
import OtpInput from '../OtpInput/OtpInput';

type Props = {
  identifier: string;
  rememberMe: boolean;

  onSuccess: (onboardingCompleted: boolean) => void;

  onBack: () => void;
};

function maskIdentifier(identifier: string) {
  if (identifier.includes('@')) {
    const [local, domain] = identifier.split('@');

    if (local.length <= 2) {
      return `${local[0] ?? ''}***@${domain}`;
    }

    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  }

  if (identifier.length <= 6) {
    return identifier;
  }

  return `${identifier.slice(0, 4)}****${identifier.slice(-3)}`;
}

function OtpVerifyForm({ identifier, rememberMe, onSuccess, onBack }: Props) {
  const [code, setCode] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);

  const otpCaptcha = useOtpCaptcha();

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (code.length !== OTP_CODE_LENGTH) {
      setError('کد ۶ رقمی ارسال‌شده رو کامل وارد کن');

      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await verifyOtp(identifier, 'LOGIN', code, rememberMe);

      if (result.status === 'success') {
        onSuccess(result.user.onboardingCompleted);

        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) {
      return;
    }

    if (!otpCaptcha.ready) {
      setError('کد تصویر امنیتی رو وارد کن');
      return;
    }

    setError('');
    setResending(true);

    try {
      const result = await requestOtp(
        identifier,
        'LOGIN',
        otpCaptcha.captcha ?? undefined
      );

      otpCaptcha.afterRequest(result);

      if (result.status === 'sent') {
        setCode('');

        setCooldown(RESEND_COOLDOWN_SECONDS);

        return;
      }

      setError(result.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-base font-bold text-gray-800 dark:text-white">
          کد تأیید را وارد کنید
        </h2>

        <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-400">
          کد به{' '}
          <span
            dir="ltr"
            className="font-medium text-gray-600 dark:text-gray-200"
          >
            {maskIdentifier(identifier)}
          </span>{' '}
          ارسال شد
        </p>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <span>{error}</span>
        </p>
      )}

      <OtpInput
        length={OTP_CODE_LENGTH}
        value={code}
        onChange={setCode}
        error={Boolean(error)}
      />

      {otpCaptcha.required && (
        <Captcha
          onChange={otpCaptcha.setCaptcha}
          resetSignal={otpCaptcha.resetSignal}
        />
      )}

      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={cooldown > 0 || resending}
        className="mx-auto cursor-pointer text-xs text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline dark:text-brand-400"
      >
        {resending
          ? 'در حال ارسال...'
          : cooldown > 0
          ? `ارسال مجدد در ${formatCountdown(cooldown)}`
          : 'ارسال مجدد کد'}
      </button>

      <Button
        type="submit"
        disabled={loading || code.length !== OTP_CODE_LENGTH}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" />
            در حال تأیید...
          </span>
        ) : (
          'تأیید و ورود'
        )}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="mx-auto flex cursor-pointer items-center gap-1 text-xs text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
      >
        <ArrowLeft size={13} />
        بازگشت به ورود
      </button>
    </form>
  );
}

export default OtpVerifyForm;
