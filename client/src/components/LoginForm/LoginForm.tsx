import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';

import {
  googleLogin,
  requestOtp,
  type CaptchaAnswer,
} from '../../api/authApi';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';

import Captcha from '../Captcha/Captcha';

import IdentifierStep from './IdentifierStep';
import MethodStep from './MethodStep';
import OtpVerifyForm from './OtpVerifyForm';
import PasswordLoginForm from './PasswordLoginForm';

type Step = 'identifier' | 'method' | 'password' | 'otp-verify';

function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>('identifier');

  // شناسه‌ی نرمال‌شده؛ بعد از «ادامه» تو مرحله‌ی اول مقدار می‌گیره
  const [identifier, setIdentifier] = useState('');

  const [rememberMe, setRememberMe] = useState(false);

  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);

  const [captchaRequired, setCaptchaRequired] = useState(false);

  // خطای سطح فرم (گوگل، ارسال کد)؛ خطای رمز تو خود PasswordLoginForm نمایش داده می‌شه
  const [error, setError] = useState('');

  const [otpSending, setOtpSending] = useState(false);

  const otpCaptcha = useOtpCaptcha();

  const externalNotice = searchParams.get('forceLogout')
    ? 'این حساب در دستگاه دیگری وارد شده است. لطفاً دوباره وارد شوید.'
    : searchParams.get('sessionExpired')
      ? 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.'
      : '';

  function goToStep(next: Step) {
    setError('');
    setStep(next);
  }

  function handleLoginSuccess(onboardingCompleted: boolean) {
    setCaptcha(null);
    setCaptchaRequired(false);

    navigate(onboardingCompleted ? '/dashboard' : '/onboarding');
  }

  function handleCaptchaRequired() {
    setCaptcha(null);
    setCaptchaRequired(true);
  }

  function handleIdentifierContinue(normalizedIdentifier: string) {
    setIdentifier(normalizedIdentifier);
    goToStep('method');
  }

  async function handleChooseCode() {
    // جلوگیری از کلیک تکراری
    if (otpSending) {
      return;
    }

    if (!otpCaptcha.ready) {
      setError('ابتدا کد تصویر امنیتی را وارد کنید');
      return;
    }

    setError('');
    setOtpSending(true);

    try {
      const result = await requestOtp(
        identifier,
        'LOGIN',
        otpCaptcha.captcha ?? undefined
      );

      otpCaptcha.afterRequest(result);

      if (result.status === 'sent') {
        setStep('otp-verify');
        return;
      }

      setError(result.message);
    } finally {
      setOtpSending(false);
    }
  }

  async function handleGoogleLogin(idToken: string) {
    setError('');

    const result = await googleLogin(idToken);

    if (result.status === 'success') {
      handleLoginSuccess(result.user.onboardingCompleted);

      return;
    }

    setError(result.message);
  }

  if (step === 'otp-verify') {
    return (
      <OtpVerifyForm
        identifier={identifier}
        rememberMe={rememberMe}
        onSuccess={handleLoginSuccess}
        onBack={() => goToStep('method')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <span>{error}</span>
        </p>
      ) : externalNotice && step === 'identifier' ? (
        <p className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300">
          <Info size={16} className="mt-0.5 shrink-0" />

          <span>{externalNotice}</span>
        </p>
      ) : null}

      {step === 'identifier' && (
        <IdentifierStep
          identifier={identifier}
          onIdentifierChange={setIdentifier}
          onContinue={handleIdentifierContinue}
          onGoogleCredential={handleGoogleLogin}
          onGoogleError={() => setError('ورود با گوگل ناموفق بود')}
        />
      )}

      {step === 'method' && (
        <>
          <MethodStep
            identifier={identifier}
            onChoosePassword={() => goToStep('password')}
            onChooseCode={handleChooseCode}
            onEdit={() => goToStep('identifier')}
            codeLoading={otpSending}
          />

          {otpCaptcha.required && (
            <Captcha
              onChange={otpCaptcha.setCaptcha}
              resetSignal={otpCaptcha.resetSignal}
            />
          )}
        </>
      )}

      {step === 'password' && (
        <PasswordLoginForm
          identifier={identifier}
          rememberMe={rememberMe}
          captchaRequired={captchaRequired}
          captcha={captcha}
          onEdit={() => goToStep('identifier')}
          onChangeMethod={() => goToStep('method')}
          onRememberMeChange={setRememberMe}
          onCaptchaChange={setCaptcha}
          onCaptchaRequired={handleCaptchaRequired}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

export default LoginForm;