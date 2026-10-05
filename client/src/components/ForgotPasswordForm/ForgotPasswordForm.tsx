import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../Button/Button';
import StepIndicator from '../StepIndicator/StepIndicator';
import IdentifierStep from './components/IdentifierStep';
import CodeStep from './components/CodeStep';
import NewPasswordStep from './components/NewPasswordStep';
import {
  requestOtp,
  verifyResetPasswordOtp,
  resetPassword,
} from '../../api/authApi';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';
import { OTP_CODE_LENGTH, RESEND_COOLDOWN_SECONDS } from '../../constants/otp';

import { detectIdentifierType, normalizeIdentifier, validateIdentifier } from '../../utils/identifier';
import { validateIdentityField } from '../SignupForm/signup.validation';

type Step = 'identifier' | 'code' | 'newPassword' | 'done';

const STEP_LABELS = ['شناسه', 'کد تایید', 'رمز جدید'];
const STEP_ORDER: Step[] = ['identifier', 'code', 'newPassword'];


function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('identifier');
  const location = useLocation();
  const [identifier, setIdentifier] = useState(typeof location.state?.identifier === 'string' ? location.state.identifier : '');
  const [code, setCode] = useState('');
  const [resetTicket, setResetTicket] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const otpCaptcha = useOtpCaptcha();
  const requesting = useRef(false);
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
    if (requesting.current) return;
    const invalid = validateIdentifier(identifier);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!otpCaptcha.ready) {
      setError('کد تصویر امنیتی رو وارد کن');
      return;
    }

    const normalized = normalizeIdentifier(identifier, detectIdentifierType(identifier)!);
    setIdentifier(normalized);
    setError('');
    requesting.current = true;
    setLoading(true);
    try {
      const result = await requestOtp(
        normalizeIdentifier(identifier, detectIdentifierType(identifier)!),
        'RESET_PASSWORD',
        otpCaptcha.captcha ?? undefined
      );
      otpCaptcha.afterRequest(result);
      if (result.status === 'sent') {
        setIdentifier(normalizeIdentifier(identifier, detectIdentifierType(identifier)!));
        setCode('');
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setStep('code');
      } else {
        setError(result.message);
      }
    } finally {
      requesting.current = false;
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (cooldown > 0 || requesting.current || !otpCaptcha.ready) {
      return;
    }

    setError('');
    requesting.current = true;
    setResending(true);
    try {
      const result = await requestOtp(
        normalizeIdentifier(identifier, detectIdentifierType(identifier)!),
        'RESET_PASSWORD',
        otpCaptcha.captcha ?? undefined
      );
      otpCaptcha.afterRequest(result);
      if (result.status === 'sent') {
        setIdentifier(normalizeIdentifier(identifier, detectIdentifierType(identifier)!));
        setCode('');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(result.message);
      }
    } finally {
      requesting.current = false;
      setResending(false);
    }
  }

  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (requesting.current) return;
    if (code.length !== OTP_CODE_LENGTH) {
      setError('کد ۶ رقمی ارسال‌شده رو کامل وارد کن');
      return;
    }

    setError('');
    requesting.current = true;
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
      requesting.current = false;
      setLoading(false);
    }
  }

  async function handleNewPasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (requesting.current) return;
    const invalid = validateIdentityField('password', { password: newPassword, confirmPassword, name: '', identifier });
    if (invalid) {
      setError(invalid);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    setError('');
    requesting.current = true;
    setLoading(true);
    try {
      const result = await resetPassword(resetTicket, newPassword);
      if (result.status === 'success') {
        setStep('done');
      } else {
        setError(result.message);
      }
    } finally {
      requesting.current = false;
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
          captcha={otpCaptcha.captcha}
          captchaRequired={otpCaptcha.required}
          onCaptchaChange={otpCaptcha.setCaptcha}
          captchaResetSignal={otpCaptcha.resetSignal}
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
          captcha={otpCaptcha.captcha}
          captchaRequired={otpCaptcha.required}
          onCaptchaChange={otpCaptcha.setCaptcha}
          captchaResetSignal={otpCaptcha.resetSignal}
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