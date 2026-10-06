import { useEffect, useRef, useState } from 'react';
import { requestOtp } from '../../api/authApi';
import { RESEND_COOLDOWN_SECONDS } from '../../constants/otp';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';

// Lifetime is the whole login flow: method changes and edits cannot reset a cooldown.
export default function useLoginCode() {
  const [sent, setSent] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const captcha = useOtpCaptcha();
  const ticking = Object.values(sent).some((deadline) => deadline > now);
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);
  const hasSent = (identifier: string) => identifier in sent;
  const remaining = (identifier: string) =>
    Math.max(0, Math.ceil(((sent[identifier] ?? 0) - now) / 1000));
  async function send(identifier: string, resend = false) {
    if (pending.current) return;
    if (hasSent(identifier) && (!resend || Date.now() < sent[identifier]))
      return;
    if (!captcha.ready) {
      setError('ابتدا کد تصویر امنیتی را وارد کنید');
      return;
    }
    pending.current = true;
    setSending(true);
    setError('');
    try {
      const result = await requestOtp(
        identifier,
        'LOGIN',
        captcha.captcha ?? undefined,
      );
      captcha.afterRequest(result);
      if (result.status === 'sent') {
        const time = Date.now();
        setNow(time);
        setSent((current) => ({
          ...current,
          [identifier]: time + RESEND_COOLDOWN_SECONDS * 1000,
        }));
      } else setError(result.message);
    } finally {
      pending.current = false;
      setSending(false);
    }
  }
  return {
    hasSent,
    remaining,
    send,
    sending,
    error,
    clearError: () => setError(''),
    captcha,
  };
}
