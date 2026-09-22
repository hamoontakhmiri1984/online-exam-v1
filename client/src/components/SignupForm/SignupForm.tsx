import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../Button/Button';
import StepIndicator from '../StepIndicator/StepIndicator';

import IdentityStep from './IdentityStep';
import OtpStep from './OtpStep';
import ReviewStep from './ReviewStep';
import RoleStep from './RoleStep';

import {
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_REGEX,
  WIZARD_LABELS,
  WIZARD_ORDER,
  type AccountRole,
  type SignupStep,
  type WizardStep,
} from './signup.types';

import {
  register,
  requestOtp,
  verifyOtp,
  type RegisterInput,
} from '../../api/authApi';

import { OTP_CODE_LENGTH } from '../../constants/otp';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';
import { isValidIdentifier } from '../../utils/identifier';
import Captcha from '../Captcha/Captcha';

function SignupForm() {
  const navigate = useNavigate();

  const [step, setStep] = useState<SignupStep>('role');
  const [role, setRole] = useState<AccountRole | null>(null);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');

  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const otpCaptcha = useOtpCaptcha();

  // هر بار که تغییر کنه، شمارنده‌ی «ارسال مجدد» داخل OtpStep از اول شروع می‌شه
  const [resendSignal, setResendSignal] = useState(0);

  function goToWizardStep(target: WizardStep) {
    setError('');
    setStep(target);
  }

  function handleRoleChange(nextRole: AccountRole) {
    setError('');

    // اگه نقش عوض شد، اطلاعاتی که قبلاً برای نقش قبلی پر شده بود پاک می‌شه
    // (کلیک دوباره روی همون نقش چیزی رو پاک نمی‌کنه)
    if (role !== null && nextRole !== role) {
      setName('');
      setIdentifier('');
      setPassword('');
      setConfirmPassword('');
      setCode('');
    }

    setRole(nextRole);
  }

  function handleRoleNext() {
    if (!role) {
      setError('نوع حساب رو انتخاب کن');
      return;
    }

    goToWizardStep('identity');
  }

  function handleIdentityNext() {
    if (!name.trim() || !identifier.trim()) {
      setError('لطفاً همه فیلدها رو پر کن');
      return;
    }

    if (name.trim().length < MIN_NAME_LENGTH) {
      setError(`نام باید حداقل ${MIN_NAME_LENGTH} کاراکتر باشه`);
      return;
    }

    if (!isValidIdentifier(identifier)) {
      setError('ایمیل یا شماره موبایل نامعتبره');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشه`);
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError('رمز عبور باید ترکیبی از حرف و عدد باشه');
      return;
    }

    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }

    goToWizardStep('review');
  }

  async function handleFinalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!role) {
      setError('نوع حساب مشخص نشده');
      return;
    }

    if (!otpCaptcha.ready) {
      setError('کد تصویر امنیتی رو وارد کن');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const input: RegisterInput = {
        identifier: identifier.trim(),
        password,
        name: name.trim(),
        role,
        captcha: otpCaptcha.captcha ?? undefined,
      };

      const result = await register(input);

      otpCaptcha.afterRequest(result);

      if (result.status === 'otp_sent') {
        setCode('');
        setResendSignal((current) => current + 1);
        setStep('otp');
        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();

    if (code.length !== OTP_CODE_LENGTH) {
      setError('کد ۶ رقمی رو کامل وارد کن');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await verifyOtp(identifier.trim(), 'REGISTER', code, true);

      if (result.status === 'success') {
        navigate(
          result.user.onboardingCompleted ? '/dashboard' : '/onboarding'
        );
        return;
      }

      if (result.status === 'pending_approval') {
        setPendingMessage(result.message);
        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resending) {
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
        identifier.trim(),
        'REGISTER',
        otpCaptcha.captcha ?? undefined
      );

      otpCaptcha.afterRequest(result);

      if (result.status === 'sent') {
        setCode('');
        setResendSignal((current) => current + 1);
        return;
      }

      setError(result.message);
    } finally {
      setResending(false);
    }
  }

  function handleOtpBack() {
    setError('');
    setCode('');
    setStep('review');
  }

  if (pendingMessage) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-3 text-sm text-gray-700 dark:border-brand-900 dark:bg-brand-950/30 dark:text-gray-200">
          {pendingMessage}
        </p>

        <Button type="button" onClick={() => navigate('/login')}>
          رفتن به صفحه ورود
        </Button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <OtpStep
        identifier={identifier}
        code={code}
        error={error}
        loading={loading}
        resending={resending}
        resendSignal={resendSignal}
        captchaSlot={
          otpCaptcha.required ? (
            <Captcha
              onChange={otpCaptcha.setCaptcha}
              resetSignal={otpCaptcha.resetSignal}
            />
          ) : null
        }
        onCodeChange={setCode}
        onBack={handleOtpBack}
        onResend={() => void handleResendCode()}
        onSubmit={handleOtpSubmit}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator
        steps={WIZARD_LABELS}
        currentIndex={WIZARD_ORDER.indexOf(step)}
      />

      {error && (
        <div className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400">
          {error}
        </div>
      )}

      {step === 'role' && (
        <RoleStep
          role={role}
          onRoleChange={handleRoleChange}
          onNext={handleRoleNext}
        />
      )}

      {step === 'identity' && (
        <IdentityStep
          name={name}
          identifier={identifier}
          password={password}
          confirmPassword={confirmPassword}
          onNameChange={setName}
          onIdentifierChange={setIdentifier}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onBack={() => goToWizardStep('role')}
          onNext={handleIdentityNext}
        />
      )}

      {step === 'review' && role && otpCaptcha.required && (
        <Captcha
          onChange={otpCaptcha.setCaptcha}
          resetSignal={otpCaptcha.resetSignal}
        />
      )}

      {step === 'review' && role && (
        <ReviewStep
          role={role}
          name={name}
          identifier={identifier}
          loading={loading}
          onBack={() => goToWizardStep('identity')}
          onSubmit={handleFinalSubmit}
        />
      )}
    </div>
  );
}

export default SignupForm;
