import { useEffect, useState } from 'react';
import { Link2, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import GoogleSignInButton from '../../../components/GoogleSignInButton/GoogleSignInButton';
import {
  getConnectedAccountsStatus,
  linkGoogleAccount,
  unlinkGoogleAccount,
} from '../../../api/authApi';

// چون /auth/me (که وضعیت واقعی googleLinked/hasPassword رو داره) نه موقع
// لاگین با پسورد/OTP صدا زده می‌شه نه موقع bootstrap کش می‌مونه با این
// جزئیات، این کامپوننت خودش یه فراخوانی تازه می‌زنه - به currentUser کش‌شده
// تو authApi.ts متکی نیست
function ConnectedAccountsSection() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getConnectedAccountsStatus().then((result) => {
      if (cancelled) return;
      if (result.status === 'success') {
        setGoogleLinked(result.googleLinked);
        setHasPassword(result.hasPassword);
      } else {
        setError(result.message);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLink(idToken: string) {
    setError('');
    setBusy(true);
    try {
      const result = await linkGoogleAccount(idToken);
      if (result.status === 'success') {
        setGoogleLinked(result.googleLinked);
        setHasPassword(result.hasPassword);
      } else {
        setError(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink() {
    setError('');
    setBusy(true);
    try {
      const result = await unlinkGoogleAccount();
      if (result.status === 'success') {
        setGoogleLinked(result.googleLinked);
        setHasPassword(result.hasPassword);
      } else {
        setError(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <Link2 size={18} />
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-white">
          حساب‌های متصل
        </h2>
      </div>

      {error && (
        <p className="mb-3 text-danger-600 dark:text-danger-400 text-sm bg-danger-50 dark:bg-danger-950/40 border border-danger-100 dark:border-danger-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Loader2 size={13} className="animate-spin" />
          در حال بررسی...
        </p>
      ) : googleLinked ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200">
            <CheckCircle2
              size={16}
              className="text-success-600 dark:text-success-500"
            />
            حساب گوگلت وصله
          </span>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={busy}
            className="text-xs font-medium text-danger-600 hover:underline dark:text-danger-400 cursor-pointer disabled:opacity-60"
          >
            {busy ? 'در حال قطع...' : 'قطع اتصال'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            با وصل کردن حساب گوگل، دفعه‌ی بعد می‌تونی بدون رمز عبور وارد بشی
          </p>
          <GoogleSignInButton
            text="continue_with"
            onCredential={handleLink}
            onError={() => setError('اتصال حساب گوگل ناموفق بود')}
          />
        </div>
      )}

      {!loading && !hasPassword && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          چون رمز عبور نداری، اگه اتصال گوگل رو قطع کنی فقط با کد یکبارمصرف
          می‌تونی وارد بشی
        </p>
      )}
    </div>
  );
}

export default ConnectedAccountsSection;
