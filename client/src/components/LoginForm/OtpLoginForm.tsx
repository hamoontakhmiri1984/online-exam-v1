import { useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { requestOtp } from '../../api/authApi';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';

import Captcha from '../Captcha/Captcha';

import Button from '../Button/Button';
import TextBox from '../TextBox/TextBox';

type Props = {
  identifier: string;

  onIdentifierChange: (value: string) => void;

  onOtpSent: () => void;
};

function OtpLoginForm({ identifier, onIdentifierChange, onOtpSent }: Props) {
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const otpCaptcha = useOtpCaptcha();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      setError('ایمیل یا شماره موبایلت رو وارد کن');

      return;
    }

    if (!otpCaptcha.ready) {
      setError('کد تصویر امنیتی رو وارد کن');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await requestOtp(
        normalizedIdentifier,
        'LOGIN',
        otpCaptcha.captcha ?? undefined
      );

      otpCaptcha.afterRequest(result);

      if (result.status === 'sent') {
        onOtpSent();
        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <span>{error}</span>
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label
          htmlFor="otp-identifier"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          ایمیل یا شماره موبایل
        </label>

        <TextBox
          type="text"
          id="otp-identifier"
          name="username"
          autoComplete="username"
          autoFocus
          placeholder="ایمیل یا شماره موبایل"
          value={identifier}
          onChange={(event) => onIdentifierChange(event.target.value)}
        />
      </div>

      {otpCaptcha.required && (
        <Captcha
          onChange={otpCaptcha.setCaptcha}
          resetSignal={otpCaptcha.resetSignal}
        />
      )}

      <Button type="submit" disabled={loading || !otpCaptcha.ready}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" />
            در حال ارسال کد...
          </span>
        ) : (
          'ارسال کد'
        )}
      </Button>
    </form>
  );
}

export default OtpLoginForm;
