import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { verifyOtp } from '../../api/authApi';
import { OTP_CODE_LENGTH } from '../../constants/otp';
import { formatCountdown } from '../../utils/formatCountdown';
import Button from '../Button/Button';
import OtpInput from '../OtpInput/OtpInput';
import IdentifierSummary from './IdentifierSummary';

type Props = {
  identifier: string;
  rememberMe: boolean;
  onSuccess: (completed: boolean) => void;
  onEdit: () => void;
  onPassword: () => void;
  sent: boolean;
  sending: boolean;
  cooldown: number;
  sendError: string;
  onResend: () => void;
  captchaSlot?: ReactNode;
};
export default function OtpVerifyForm({
  identifier,
  rememberMe,
  onSuccess,
  onEdit,
  onPassword,
  sent,
  sending,
  cooldown,
  sendError,
  onResend,
  captchaSlot,
}: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const pending = useRef(false);
  const busy = loading || sending;
  async function verify(value: string) {
    if (pending.current || sending || !sent || value.length !== OTP_CODE_LENGTH)
      return;
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await verifyOtp(identifier, 'LOGIN', value, rememberMe);
      if (result.status === 'success') {
        onSuccess(result.user.onboardingCompleted);
        return;
      }
      setError(result.message);
      setCode('');
      setInputKey((current) => current + 1);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void verify(code);
  }
  function resend() {
    if (pending.current || busy || cooldown > 0) return;
    setCode('');
    setError('');
    setInputKey((current) => current + 1);
    onResend();
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <IdentifierSummary
        identifier={identifier}
        onEdit={onEdit}
        disabled={busy}
      />
      <p
        role="status"
        className="text-center text-sm text-gray-600 dark:text-gray-300"
      >
        {sending
          ? 'در حال ارسال کد تأیید…'
          : sent
            ? 'اگر این حساب وجود داشته باشد، کد تأیید برای آن ارسال می‌شود.'
            : 'کد هنوز ارسال نشده است. دوباره تلاش کنید یا با رمز عبور وارد شوید.'}
      </p>
      {(sendError || error) && (
        <p
          role="alert"
          className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:bg-danger-950/40 dark:text-danger-400"
        >
          {sendError || error}
        </p>
      )}
      {sent && (
        <>
          <h2 className="text-center text-base font-bold text-gray-800 dark:text-white">
            کد تأیید را وارد کنید
          </h2>
          <OtpInput
            key={inputKey}
            value={code}
            length={OTP_CODE_LENGTH}
            disabled={busy}
            error={Boolean(error)}
            onChange={(value) => {
              setCode(value);
              setError('');
              if (value.length === OTP_CODE_LENGTH) void verify(value);
            }}
          />
        </>
      )}
      {captchaSlot}
      {!sent ? (
        <Button type="button" onClick={resend} disabled={busy}>
          ارسال کد تأیید
        </Button>
      ) : (
        <>
          <button
            type="button"
            onClick={resend}
            disabled={busy || cooldown > 0}
            className="text-sm text-brand-600 disabled:opacity-50 dark:text-brand-400"
          >
            {cooldown > 0
              ? `ارسال مجدد در ${formatCountdown(cooldown)}`
              : 'ارسال مجدد کد'}
          </button>
          <Button
            type="submit"
            disabled={busy || code.length !== OTP_CODE_LENGTH}
          >
            {loading ? 'در حال تأیید…' : 'تأیید و ورود'}
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={onPassword}
        disabled={busy}
        className="text-sm text-brand-600 disabled:opacity-50 dark:text-brand-400"
      >
        ورود با رمز عبور
      </button>
    </form>
  );
}
