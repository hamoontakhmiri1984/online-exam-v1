import { useEffect, useRef, useState } from 'react';
import { requestOtp } from '../../api/authApi';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';

// Lifetime is the whole login flow: method changes and edits cannot reset a cooldown.
export default function useLoginCode() {
  const [sent, setSent] = useState<Record<string, true>>({});
  const [retryAt, setRetryAt] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const captcha = useOtpCaptcha();
  const ticking = Object.values(retryAt).some((deadline) => deadline > now);
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);
  const hasSent = (identifier: string) => identifier in sent;
  const remaining = (identifier: string) =>
    Math.max(0, Math.ceil(((retryAt[identifier] ?? 0) - now) / 1000));
  async function send(identifier: string, resend = false) {
    if (pending.current) return;
    if (Date.now() < (retryAt[identifier] ?? 0)) return;
    if (hasSent(identifier) && !resend) return;
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
        setSent((current) => ({ ...current, [identifier]: true }));
      } else if (result.retryAfterSeconds) {
        const time = Date.now();
        const deadline = time + result.retryAfterSeconds * 1000;
        setNow(time);
        setRetryAt((current) => ({ ...current, [identifier]: deadline }));
      } else {
        setError(result.message);
      }
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
