import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Button from '../Button/Button';
import TextBox from '../TextBox/TextBox';
import OtpInput from '../OtpInput/OtpInput';
import PasswordField from '../PasswordField/PasswordField';
import Captcha from '../Captcha/Captcha';
import StepIndicator from '../StepIndicator/StepIndicator';
import {
  requestOtp,
  verifyResetPasswordOtp,
  resetPassword,
  type CaptchaAnswer,
} from '../../api/authApi';
import { OTP_CODE_LENGTH, RESEND_COOLDOWN_SECONDS } from '../../constants/otp';
import { formatCountdown } from '../../utils/formatCountdown';

type Step = 'identifier' | 'code' | 'newPassword' | 'done';

const STEP_LABELS = ['شناسه', 'کد تایید', 'رمز جدید'];
const STEP_ORDER: Step[] = ['identifier', 'code', 'newPassword'];
const MIN_PASSWORD_LENGTH = 6;
function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [resetTicket, setResetTicket] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 'code' || cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, cooldown]);

  async function handleIdentifierSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim()) {
      setError('ایمیل یا شماره موبایلت رو وارد کن');
      return;
    }
    if (!captcha) {
      setError('کد تصویر امنیتی رو وارد کن');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await requestOtp(
        identifier,
        'RESET_PASSWORD',
        captcha ?? undefined
      );
      // کپچا یک‌بارمصرفه؛ چه موفق چه ناموفق، چالش جدید بگیر
      setCaptcha(null);
      setCaptchaResetSignal((current) => current + 1);
      if (result.status === 'sent') {
        setCode('');
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setStep('code');
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (cooldown > 0 || resending || !captcha) {
      return;
    }

    setError('');
    setResending(true);
    try {
      const result = await requestOtp(
        identifier,
        'RESET_PASSWORD',
        captcha ?? undefined
      );
      setCaptcha(null);
      setCaptchaResetSignal((current) => current + 1);
      if (result.status === 'sent') {
        setCode('');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(result.message);
      }
    } finally {
      setResending(false);
    }
  }

  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== OTP_CODE_LENGTH) {
      setError('کد ۶ رقمی ارسال‌شده رو کامل وارد کن');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await verifyResetPasswordOtp(identifier, code);
      if (result.status === 'success') {
        setResetTicket(result.resetTicket);
        setStep('newPassword');
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشه`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(resetTicket, newPassword);
      if (result.status === 'success') {
        setStep('done');
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-200 bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-lg px-3 py-3">
          رمز عبورت با موفقیت عوض شد. حالا می‌تونی با رمز جدید وارد بشی
        </p>
        <Button type="button" onClick={() => navigate('/login')}>
          رفتن به صفحه‌ی ورود
        </Button>
      </div>
    );
  }

  const wizardIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator steps={STEP_LABELS} currentIndex={wizardIndex} />

      {error && (
        <p className="text-danger-600 dark:text-danger-400 text-sm bg-danger-50 dark:bg-danger-950/40 border border-danger-100 dark:border-danger-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {step === 'identifier' && (
        <form onSubmit={handleIdentifierSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="forgot-identifier"
              className="text-sm text-gray-600 dark:text-gray-300"
            >
              ایمیل یا شماره موبایل
            </label>
            <TextBox
              type="text"
              id="forgot-identifier"
              name="username"
              autoComplete="username"
              autoFocus
              placeholder="مثلاً 0912xxxxxxx یا name@email.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              icon={<Mail size={16} />}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              همون ایمیل یا موبایلی که موقع ثبت‌نام استفاده کردی
            </p>
          </div>

          <Captcha onChange={setCaptcha} resetSignal={captchaResetSignal} />

          <Button type="submit" disabled={loading || !captcha}>
            {loading ? 'در حال ارسال کد...' : 'ارسال کد تایید'}
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            کد تایید به{' '}
            <span
              dir="ltr"
              className="font-medium text-gray-700 dark:text-gray-200"
            >
              {identifier}
            </span>{' '}
            ارسال شد
          </p>

          <OtpInput
            length={OTP_CODE_LENGTH}
            value={code}
            onChange={setCode}
            error={Boolean(error)}
          />

          {cooldown > 0 ? (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              ارسال مجدد در {formatCountdown(cooldown)}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Captcha onChange={setCaptcha} resetSignal={captchaResetSignal} />
              <button
                type="button"
                onClick={() => void handleResendCode()}
                disabled={resending || !captcha}
                className="cursor-pointer text-xs text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline dark:text-brand-400"
              >
                {resending ? 'در حال ارسال...' : 'ارسال مجدد کد'}
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || code.length !== OTP_CODE_LENGTH}
          >
            {loading ? 'در حال بررسی...' : 'تایید کد'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setError('');
              setCode('');
              setStep('identifier');
            }}
            className="text-xs text-brand-600 hover:underline dark:text-brand-400 cursor-pointer"
          >
            بازگشت و اصلاح شناسه
          </button>
        </form>
      )}

      {step === 'newPassword' && (
        <form
          onSubmit={handleNewPasswordSubmit}
          className="flex flex-col gap-4"
        >
          <PasswordField
            label="رمز عبور جدید"
            id="forgot-new-password"
            name="new-password"
            autoComplete="new-password"
            autoFocus
            placeholder="حداقل ۶ کاراکتر، ترکیبی از حرف و عدد"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            showStrength
          />
          <PasswordField
            label="تکرار رمز عبور جدید"
            id="forgot-confirm-password"
            name="new-password"
            autoComplete="new-password"
            placeholder="دوباره وارد کن"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={
              confirmPassword && confirmPassword !== newPassword
                ? 'با رمز عبور بالا یکسان نیست'
                : undefined
            }
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'در حال ثبت...' : 'تغییر رمز عبور'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default ForgotPasswordForm;
