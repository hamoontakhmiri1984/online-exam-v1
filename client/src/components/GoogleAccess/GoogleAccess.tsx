import { useRef, useState } from 'react';
import { googleLogin } from '../../api/authApi';
import Button from '../Button/Button';
import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton';
import TextBox from '../TextBox/TextBox';

type Props = {
  onSuccess: (completed: boolean) => void;
  onFlowChange: (active: boolean) => void;
};

// Keep the Google credential in memory only; the server verifies it again on account creation.
export default function GoogleAccess({ onSuccess, onFlowChange }: Props) {
  const [credential, setCredential] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Student' | 'Instructor'>('Student');
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(false);

  async function submit(token: string, register = false) {
    if (request.current) return;
    request.current = true;
    setBusy(true);
    setError('');
    onFlowChange(true);
    let keepOpen = Boolean(credential);
    try {
      const result = await googleLogin(
        token,
        register ? { role, name: name.trim() } : undefined,
      );
      if (result.status === 'success')
        onSuccess(result.user.onboardingCompleted);
      else if (result.status === 'registration_required') {
        setCredential(token);
        keepOpen = true;
      } else if (result.status === 'pending_approval') {
        setPending(result.message);
        setCredential('');
        keepOpen = true;
      } else setError(result.message);
    } finally {
      request.current = false;
      setBusy(false);
      onFlowChange(keepOpen);
    }
  }
  function reset() {
    if (request.current) return;
    setCredential('');
    setError('');
    setPending('');
    setName('');
    onFlowChange(false);
  }
  return (
    <div className="flex flex-col gap-4" aria-busy={busy}>
      {error && (
        <p
          role="alert"
          className="text-sm text-danger-600 dark:text-danger-400"
        >
          {error}
        </p>
      )}
      {pending ? (
        <>
          <p role="status" className="text-sm text-gray-700 dark:text-gray-200">
            {pending}
          </p>
          <Button type="button" onClick={reset}>
            بازگشت به ورود
          </Button>
        </>
      ) : credential ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(credential, true);
          }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ایمیل شما با گوگل تأیید شد. برای ساخت حساب، اطلاعات زیر را تکمیل
            کنید.
          </p>
          <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
            <label
              htmlFor="google-name"
              className="text-sm text-gray-700 dark:text-gray-200"
            >
              نام و نام خانوادگی
            </label>
            <TextBox
              type="text"
              placeholder="مثلاً علی رضایی"
              maxLength={100}
              id="google-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              autoFocus
            />
            <fieldset className="flex gap-4 text-sm text-gray-700 dark:text-gray-200">
              <legend className="mb-2">نوع حساب</legend>
              <label>
                <input
                  type="radio"
                  name="google-role"
                  checked={role === 'Student'}
                  onChange={() => setRole('Student')}
                />{' '}
                کارآموز
              </label>
              <label>
                <input
                  type="radio"
                  name="google-role"
                  checked={role === 'Instructor'}
                  onChange={() => setRole('Instructor')}
                />{' '}
                مدرس
              </label>
            </fieldset>
            <Button
              type="submit"
              disabled={
                busy || name.trim().length < 2 || name.trim().length > 100
              }
            >
              {busy ? 'در حال ساخت حساب…' : 'ساخت حساب'}
            </Button>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-brand-600 dark:text-brand-400"
            >
              بازگشت
            </button>
          </fieldset>
        </form>
      ) : busy ? (
        <p role="status" className="text-sm text-gray-600 dark:text-gray-300">
          در حال بررسی حساب گوگل…
        </p>
      ) : (
        <GoogleSignInButton
          onCredential={(token) => void submit(token)}
          onError={() => setError('ورود با گوگل ناموفق بود؛ دوباره تلاش کنید')}
        />
      )}
    </div>
  );
}
