import { useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUser, resolveAuthEntry, type CaptchaAnswer } from '../../api/authApi';
import { detectIdentifierType } from '../../utils/identifier';
import { ApiError } from '../../lib/apiClient';
import { sessionNotice } from '../../lib/sessionNotice';
import AuthBack from '../AuthBack/AuthBack';
import Captcha from '../Captcha/Captcha';
import IdentifierStep from './IdentifierStep';
import OtpVerifyForm from './OtpVerifyForm';
import PasswordLoginForm from './PasswordLoginForm';
import useLoginCode from './useLoginCode';

type Step = 'identifier' | 'password' | 'otp';
export default function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initial =
    typeof location.state?.identifier === 'string'
      ? location.state.identifier
      : '';
  const [step, setStep] = useState<Step>(
    initial && location.state?.step === 'password' ? 'password' : 'identifier',
  );
  const [history, setHistory] = useState<Step[]>(
    initial && location.state?.step === 'password' ? ['identifier'] : [],
  );
  const [identifier, setIdentifier] = useState(initial);
  const [entryError, setEntryError] = useState('');
  const [checking, setChecking] = useState(false);
  const entryPending = useRef(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [verifyCaptchaRequired, setVerifyCaptchaRequired] = useState(false);
  const code = useLoginCode();
  const notice = sessionNotice(searchParams);
  function success() {
    const role = getCurrentUser()?.role;
    navigate(role === 'Instructor' || role === 'SuperAdmin' ? '/workspace' : '/dashboard', { replace: true });
  }
  function go(next: Step) {
    code.clearError();
    setCaptcha(null);
    setHistory((current) => (next === 'identifier' ? [] : [...current, step]));
    setStep(next);
  }
  function showCode(value = identifier) {
    setVerifyCaptchaRequired(false);
    go('otp');
    void code.send(value);
  }
  function back() {
    code.clearError();
    setCaptcha(null);
    setStep(history.at(-1) ?? 'identifier');
    setHistory((current) => current.slice(0, -1));
  }
  async function continueWith(value: string) {
    if (entryPending.current) return;
    entryPending.current = true;
    setChecking(true);
    setEntryError('');
    setIdentifier(value);
    try {
      const result = await resolveAuthEntry(value);
      setIdentifier(result.identifier);
      if (result.next === 'signup')
        navigate('/signup', {
          state: { identifier: result.identifier, fromEntry: true },
        });
      else if (result.next === 'otp') showCode(result.identifier);
      else go('password');
    } catch (error) {
      setEntryError(
        error instanceof ApiError
          ? error.message
          : 'بررسی حساب ممکن نشد؛ دوباره تلاش کنید',
      );
    } finally {
      entryPending.current = false;
      setChecking(false);
    }
  }
  return (
    <div className="flex flex-col gap-4">
      {step === 'identifier' && (
        <>
          <AuthBack onClick={() => navigate('/')} disabled={checking} />
          {entryError && (
            <p
              role="alert"
              className="text-sm text-danger-600 dark:text-danger-400"
            >
              {entryError}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="text-sm text-brand-ink"
            >
              {notice}
            </p>
          )}
          <IdentifierStep
            busy={checking}
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
          onBack={back}
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
          onBack={back}
          onEdit={() => go('identifier')}
          onPassword={() => go('password')}
          sent={code.hasSent(identifier)}
          sending={code.sending}
          cooldown={code.remaining(identifier)}
          sendError={code.error}
          onResend={() => { setVerifyCaptchaRequired(false); void code.send(identifier, true); }}
          captchaRequired={verifyCaptchaRequired}
          captcha={code.captcha.captcha}
          onVerifyFailed={(required) => {
            if (required) {
              setVerifyCaptchaRequired(true);
              code.captcha.afterRequest({ status: 'error', captchaRequired: true });
            }
          }}
          captchaSlot={
            (verifyCaptchaRequired || code.captcha.required) ? (
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
