import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CaptchaAnswer } from '../../api/authApi';
import { detectIdentifierType } from '../../utils/identifier';
import Captcha from '../Captcha/Captcha';
import IdentifierStep from './IdentifierStep';
import OtpVerifyForm from './OtpVerifyForm';
import PasswordLoginForm from './PasswordLoginForm';
import useLoginCode from './useLoginCode';

type Step = 'identifier' | 'password' | 'otp';
export default function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const code = useLoginCode();
  const notice = searchParams.get('forceLogout')
    ? 'این حساب در دستگاه دیگری وارد شده است. لطفاً دوباره وارد شوید.'
    : searchParams.get('sessionExpired')
      ? 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.'
      : '';
  function success(completed: boolean) {
    navigate(completed ? '/dashboard' : '/onboarding');
  }
  function go(next: Step) {
    code.clearError();
    setCaptcha(null);
    setStep(next);
  }
  function showCode(value = identifier) {
    go('otp');
    void code.send(value);
  }
  function continueWith(value: string) {
    setIdentifier(value);
    if (detectIdentifierType(value) === 'PHONE') showCode(value);
    else go('password');
  }
  return (
    <div className="flex flex-col gap-4">
      {step === 'identifier' && (
        <>
          {notice && (
            <p
              role="status"
              className="text-sm text-brand-700 dark:text-brand-300"
            >
              {notice}
            </p>
          )}
          <IdentifierStep
            identifier={identifier}
            onIdentifierChange={setIdentifier}
            onContinue={continueWith}
            onSuccess={success}
          />
        </>
      )}
      {step === 'password' && (
        <PasswordLoginForm
          identifier={identifier}
          rememberMe={rememberMe}
          captchaRequired={captchaRequired}
          captcha={captcha}
          onEdit={() => go('identifier')}
          onChangeMethod={() => showCode()}
          codeLabel={
            code.hasSent(identifier)
              ? 'ورود با کد تأیید'
              : detectIdentifierType(identifier) === 'PHONE'
                ? 'دریافت کد پیامکی'
                : 'دریافت کد با ایمیل'
          }
          onRememberMeChange={setRememberMe}
          onCaptchaChange={setCaptcha}
          onCaptchaRequired={() => {
            setCaptcha(null);
            setCaptchaRequired(true);
          }}
          onSuccess={success}
        />
      )}
      {step === 'otp' && (
        <OtpVerifyForm
          identifier={identifier}
          rememberMe={rememberMe}
          onSuccess={success}
          onEdit={() => go('identifier')}
          onPassword={() => go('password')}
          sent={code.hasSent(identifier)}
          sending={code.sending}
          cooldown={code.remaining(identifier)}
          sendError={code.error}
          onResend={() => void code.send(identifier, true)}
          captchaSlot={
            code.captcha.required ? (
              <Captcha
                onChange={code.captcha.setCaptcha}
                resetSignal={code.captcha.resetSignal}
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
