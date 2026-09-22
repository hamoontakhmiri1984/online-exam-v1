import { useState } from 'react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  AlertTriangle,
  Info,
} from 'lucide-react';

import {
  googleLogin,
  type CaptchaAnswer,
} from '../../api/authApi';

import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton';

import OtpLoginForm from './OtpLoginForm';
import OtpVerifyForm from './OtpVerifyForm';
import PasswordLoginForm from './PasswordLoginForm';

type Mode =
  | 'password'
  | 'otp-request'
  | 'otp-verify';

function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();

  const [mode, setMode] =
    useState<Mode>('password');

  const [identifier, setIdentifier] =
    useState('');

  const [rememberMe, setRememberMe] =
    useState(false);

  const [captcha, setCaptcha] =
    useState<CaptchaAnswer | null>(null);

  const [
    captchaRequired,
    setCaptchaRequired,
  ] = useState(false);

  const [
    googleError,
    setGoogleError,
  ] = useState('');

  const externalNotice =
    searchParams.get('forceLogout')
      ? 'این حساب در دستگاه دیگری وارد شده است. لطفاً دوباره وارد شوید.'
      : searchParams.get(
            'sessionExpired',
          )
        ? 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.'
        : '';

  function handleLoginSuccess(
    onboardingCompleted: boolean,
  ) {
    setCaptcha(null);
    setCaptchaRequired(false);

    navigate(
      onboardingCompleted
        ? '/dashboard'
        : '/onboarding',
    );
  }

  function handleCaptchaRequired() {
    setCaptcha(null);
    setCaptchaRequired(true);
  }

  function changeMode(
    nextMode:
      | 'password'
      | 'otp-request',
  ) {
    if (mode === nextMode) {
      return;
    }

    setGoogleError('');
    setMode(nextMode);
  }

  async function handleGoogleLogin(
    idToken: string,
  ) {
    setGoogleError('');

    const result =
      await googleLogin(idToken);

    if (
      result.status === 'success'
    ) {
      handleLoginSuccess(
        result.user
          .onboardingCompleted,
      );

      return;
    }

    setGoogleError(result.message);
  }

  if (mode === 'otp-verify') {
    return (
      <OtpVerifyForm
        identifier={identifier}
        rememberMe={rememberMe}
        onSuccess={
          handleLoginSuccess
        }
        onBack={() =>
          setMode('otp-request')
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {googleError ? (
        <p className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0"
          />

          <span>{googleError}</span>
        </p>
      ) : externalNotice ? (
        <p className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300">
          <Info
            size={16}
            className="mt-0.5 shrink-0"
          />

          <span>
            {externalNotice}
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 text-sm dark:bg-gray-800">
        <button
          type="button"
          onClick={() =>
            changeMode('password')
          }
          className={`cursor-pointer rounded-lg py-2 font-medium transition ${
            mode === 'password'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          ورود با رمز
        </button>

        <button
          type="button"
          onClick={() =>
            changeMode(
              'otp-request',
            )
          }
          className={`cursor-pointer rounded-lg py-2 font-medium transition ${
            mode === 'otp-request'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          کد یکبار مصرف
        </button>
      </div>

      {mode === 'password' ? (
        <PasswordLoginForm
          identifier={identifier}
          rememberMe={rememberMe}
          captchaRequired={
            captchaRequired
          }
          captcha={captcha}
          onIdentifierChange={
            setIdentifier
          }
          onRememberMeChange={
            setRememberMe
          }
          onCaptchaChange={
            setCaptcha
          }
          onCaptchaRequired={
            handleCaptchaRequired
          }
          onSuccess={
            handleLoginSuccess
          }
        />
      ) : (
        <OtpLoginForm
          identifier={identifier}
          onIdentifierChange={
            setIdentifier
          }
          onOtpSent={() =>
            setMode('otp-verify')
          }
        />
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span>یا</span>
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <GoogleSignInButton
        text="signin_with"
        onCredential={
          handleGoogleLogin
        }
        onError={() =>
          setGoogleError(
            'ورود با گوگل ناموفق بود',
          )
        }
      />
    </div>
  );
}

export default LoginForm;