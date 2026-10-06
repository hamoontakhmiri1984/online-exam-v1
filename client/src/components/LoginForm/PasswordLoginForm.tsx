import { useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { loginWithPassword, type CaptchaAnswer } from '../../api/authApi';

import IdentifierSummary from './IdentifierSummary';
import Button from '../Button/Button';
import Captcha from '../Captcha/Captcha';
import PasswordField from '../PasswordField/PasswordField';

type Props = {
  /** شناسه‌ی نرمال‌شده (مرحله‌ی اول) */
  identifier: string;
  rememberMe: boolean;
  captchaRequired: boolean;
  captcha: CaptchaAnswer | null;

  /** برگشت به مرحله‌ی اول برای ویرایش شناسه */
  onEdit: () => void;

  /** برگشت به انتخاب روش ورود */
  onChangeMethod: () => void;
  codeLabel: string;

  onRememberMeChange: (value: boolean) => void;

  onCaptchaChange: (value: CaptchaAnswer | null) => void;

  onCaptchaRequired: () => void;

  onSuccess: (onboardingCompleted: boolean) => void;
};

const PASSWORD_REQUIRED_MESSAGE = 'رمز عبور را وارد کنید';

function PasswordLoginForm({
  identifier,
  rememberMe,
  captchaRequired,
  captcha,
  onEdit,
  onChangeMethod,
  codeLabel,
  onRememberMeChange,
  onCaptchaChange,
  onCaptchaRequired,
  onSuccess,
}: Props) {
  const passwordRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState('');

  // خطای همین فیلد (خالی‌بودن)
  const [passwordError, setPasswordError] = useState('');

  // خطای سرور (رمز اشتباه، قفل موقت، ...) در بنر بالای فرم
  const [serverError, setServerError] = useState('');

  const [submitted, setSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);

  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);

    // با شروع اصلاح، خطای همین فیلد پاک می‌شود
    if (passwordError) {
      setPasswordError('');
    }
  }

  function handlePasswordBlur() {
    // قبل از اولین ارسال، روی فیلد خالی خطا نشان نمی‌دهیم
    if (!password && !submitted) {
      return;
    }

    setPasswordError(password ? '' : PASSWORD_REQUIRED_MESSAGE);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setSubmitted(true);

    if (!password) {
      setPasswordError(PASSWORD_REQUIRED_MESSAGE);
      passwordRef.current?.focus();
      return;
    }

    if (captchaRequired && !captcha) {
      setServerError('کد تصویر امنیتی را وارد کنید');
      return;
    }

    setServerError('');
    setLoading(true);

    try {
      const result = await loginWithPassword(
        identifier,
        password,
        rememberMe,
        captcha ?? undefined
      );

      if (result.status === 'success') {
        onCaptchaChange(null);

        onSuccess(result.user.onboardingCompleted);

        return;
      }

      setServerError(result.message);

      if (result.captchaRequired) {
        onCaptchaRequired();
      }

      // کپچا یک‌بارمصرف است: بعد از هر تلاش ناموفق چالش جدید بگیر و ورودی را پاک کن
      if (result.captchaRequired || captchaRequired) {
        onCaptchaChange(null);
        setCaptchaResetSignal((current) => current + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {serverError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <span>{serverError}</span>
        </p>
      )}

      <IdentifierSummary identifier={identifier} onEdit={onEdit} disabled={loading} />

      {/* فیلد نام کاربری مخفی: مدیر رمز مرورگر برای ذخیره‌ی درست به آن نیاز دارد */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={identifier}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      <PasswordField
        ref={passwordRef}
        label="رمز عبور"
        id="login-password"
        name="password"
        autoComplete="current-password"
        autoFocus
        placeholder="رمز عبور"
        value={password}
        onChange={handlePasswordChange}
        onBlur={handlePasswordBlur}
        error={passwordError}
        reserveErrorSpace
      />

      <div className="flex items-center justify-between text-sm">
        <Link
          to="/forgot-password"
          state={{ identifier }}
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

      <button
        type="button"
        onClick={onChangeMethod}
        disabled={loading}
        className="mx-auto cursor-pointer text-xs text-gray-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:text-brand-400"
      >
        {codeLabel}
      </button>
    </form>
  );
}

export default PasswordLoginForm;