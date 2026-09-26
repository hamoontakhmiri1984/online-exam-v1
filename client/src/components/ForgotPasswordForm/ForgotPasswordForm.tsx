import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import StepIndicator from '../StepIndicator/StepIndicator';
import IdentifierStep from './components/IdentifierStep';
import CodeStep from './components/CodeStep';
import NewPasswordStep from './components/NewPasswordStep';
import {
  requestOtp,
  verifyResetPasswordOtp,
  resetPassword,
  type CaptchaAnswer,
} from '../../api/authApi';
import { OTP_CODE_LENGTH, RESEND_COOLDOWN_SECONDS } from '../../constants/otp';

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
        <IdentifierStep
          identifier={identifier}
          onIdentifierChange={setIdentifier}
          captcha={captcha}
          onCaptchaChange={setCaptcha}
          captchaResetSignal={captchaResetSignal}
          loading={loading}
          onSubmit={handleIdentifierSubmit}
        />
      )}

      {step === 'code' && (
        <CodeStep
          identifier={identifier}
          code={code}
          onCodeChange={setCode}
          hasError={Boolean(error)}
          cooldown={cooldown}
          captcha={captcha}
          onCaptchaChange={setCaptcha}
          captchaResetSignal={captchaResetSignal}
          resending={resending}
          onResend={() => void handleResendCode()}
          loading={loading}
          onSubmit={handleCodeSubmit}
          onBack={() => {
            setError('');
            setCode('');
            setStep('identifier');
          }}
        />
      )}

      {step === 'newPassword' && (
        <NewPasswordStep
          newPassword={newPassword}
          onNewPasswordChange={setNewPassword}
          confirmPassword={confirmPassword}
          onConfirmPasswordChange={setConfirmPassword}
          loading={loading}
          onSubmit={handleNewPasswordSubmit}
        />
      )}
    </div>
  );
}

export default ForgotPasswordForm;