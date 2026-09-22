import { useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { loginWithPassword, type CaptchaAnswer } from '../../api/authApi';

import Button from '../Button/Button';
import Captcha from '../Captcha/Captcha';
import PasswordField from '../PasswordField/PasswordField';
import TextBox from '../TextBox/TextBox';

type Props = {
  identifier: string;
  rememberMe: boolean;
  captchaRequired: boolean;
  captcha: CaptchaAnswer | null;

  onIdentifierChange: (value: string) => void;

  onRememberMeChange: (value: boolean) => void;

  onCaptchaChange: (value: CaptchaAnswer | null) => void;

  onCaptchaRequired: () => void;

  onSuccess: (onboardingCompleted: boolean) => void;
};

function PasswordLoginForm({
  identifier,
  rememberMe,
  captchaRequired,
  captcha,
  onIdentifierChange,
  onRememberMeChange,
  onCaptchaChange,
  onCaptchaRequired,
  onSuccess,
}: Props) {
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!identifier.trim() || !password) {
      setError('لطفاً همه فیلدها را پر کنید');
      return;
    }

    if (captchaRequired && !captcha) {
      setError('لطفاً کد تصویر امنیتی رو هم وارد کن');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await loginWithPassword(
        identifier.trim(),
        password,
        rememberMe,
        captcha ?? undefined
      );

      if (result.status === 'success') {
        onCaptchaChange(null);

        onSuccess(result.user.onboardingCompleted);

        return;
      }

      setError(result.message);

      if (result.captchaRequired) {
        onCaptchaRequired();
      }

      // کپچا یک‌بارمصرفه: بعد از هر تلاش ناموفق چالش جدید بگیر و ورودی رو پاک کن
      if (result.captchaRequired || captchaRequired) {
        onCaptchaChange(null);
        setCaptchaResetSignal((current) => current + 1);
      }
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
          htmlFor="login-identifier"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          ایمیل، شماره موبایل یا نام کاربری
        </label>

        <TextBox
          type="text"
          id="login-identifier"
          name="username"
          autoComplete="username"
          autoFocus
          placeholder="ایمیل، موبایل یا نام کاربری"
          value={identifier}
          onChange={(event) => onIdentifierChange(event.target.value)}
        />
      </div>

      <PasswordField
        label="رمز عبور"
        id="login-password"
        name="password"
        autoComplete="current-password"
        placeholder="رمز عبورت"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <div className="flex items-center justify-between text-sm">
        <Link
          to="/forgot-password"
          className="text-xs text-brand-600 hover:underline dark:text-brand-400"
        >
          رمز عبور را فراموش کرده‌اید؟
        </Link>

        <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => onRememberMeChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
          />
          مرا به خاطر بسپار
        </label>
      </div>

      {captchaRequired && (
        <Captcha onChange={onCaptchaChange} resetSignal={captchaResetSignal} />
      )}

      <Button type="submit" disabled={loading || (captchaRequired && !captcha)}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" />
            در حال ورود...
          </span>
        ) : (
          'ورود'
        )}
      </Button>
    </form>
  );
}

export default PasswordLoginForm;
