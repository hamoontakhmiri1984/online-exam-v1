import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import Button from '../Button/Button';
import OtpInput from '../OtpInput/OtpInput';

import { OTP_CODE_LENGTH, RESEND_COOLDOWN_SECONDS } from '../../constants/otp';
import { formatCountdown } from '../../utils/formatCountdown';

type OtpStepProps = {
  identifier: string;
  code: string;
  error: string;
  loading: boolean;
  resending: boolean;
  resendSignal: number;
  captchaSlot?: ReactNode;

  onCodeChange: (value: string) => void;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (event: FormEvent) => void;
};

function OtpStep({
  identifier,
  code,
  error,
  loading,
  resending,
  resendSignal,
  captchaSlot,
  onCodeChange,
  onBack,
  onResend,
  onSubmit,
}: OtpStepProps) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }, [resendSignal]);

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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400">
          {error}
        </p>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        کد تایید به{' '}
        <span
          dir="ltr"
          className="font-medium text-gray-700 dark:text-gray-200"
        >
          {identifier}
        </span>{' '}
        ارسال شد
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          کد تایید
        </label>

        <OtpInput
          length={OTP_CODE_LENGTH}
          value={code}
          onChange={onCodeChange}
          error={Boolean(error)}
        />
      </div>

      {captchaSlot}

      <button
        type="button"
        onClick={onResend}
        disabled={cooldown > 0 || resending}
        className="mx-auto cursor-pointer text-xs text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline dark:text-brand-400"
      >
        {resending
          ? 'در حال ارسال مجدد...'
          : cooldown > 0
          ? `ارسال مجدد در ${formatCountdown(cooldown)}`
          : 'ارسال مجدد کد'}
      </button>

      <Button
        type="submit"
        disabled={loading || code.length !== OTP_CODE_LENGTH}
      >
        {loading ? 'در حال بررسی...' : 'تایید و ساخت حساب'}
      </Button>

      <button
        type="button"
        onClick={onBack}
        disabled={loading || resending}
        className="cursor-pointer text-xs text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-400"
      >
        بازگشت و اصلاح اطلاعات
      </button>
    </form>
  );
}

export default OtpStep;
