import { useEffect, useState, type FormEvent } from 'react';
import { Check, KeyRound, Loader2 } from 'lucide-react';
import { changePassword, getConnectedAccountsStatus } from '../../../api/authApi';
import Button from '../../../components/Button/Button';
import PasswordField from '../../../components/PasswordField/PasswordField';
import { PASSWORD_REGEX } from '../../../components/SignupForm/signup.types';

type Errors = {
  current?: string;
  next?: string;
  confirm?: string;
};

// Read hasPassword from /auth/me; OTP-only accounts do not need a current password.
function PasswordSection() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConnectedAccountsStatus().then((result) => {
      if (cancelled) return;
      if (result.status === 'success') setHasPassword(result.hasPassword);
      else setLoadError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  function validate(): Errors {
    const next: Errors = {};
    if (hasPassword && !currentPassword) next.current = 'رمز عبور فعلی را وارد کنید';
    if (!newPassword) next.next = 'رمز عبور جدید را وارد کنید';
    else if (newPassword.length > 72) next.next = 'رمز نباید بیشتر از ۷۲ کاراکتر باشد';
    else if (!PASSWORD_REGEX.test(newPassword)) next.next = 'رمز عبور شرایط لازم را ندارد';
    if (!confirmPassword) next.confirm = 'تکرار رمز عبور را وارد کنید';
    else if (confirmPassword !== newPassword) next.confirm = 'با رمز عبور بالا یکسان نیست';
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || hasPassword === null) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setServerError('');
    setSaved(false);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const result = await changePassword(
        hasPassword ? currentPassword : undefined,
        newPassword,
      );
      if (result.status === 'success') {
        setHasPassword(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSaved(true);
      } else {
        setServerError(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const title = hasPassword === false ? 'تعیین رمز عبور' : 'تغییر رمز عبور';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <KeyRound size={18} />
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>

      {loadError ? (
        <p className="text-sm text-danger-600 dark:text-danger-400">{loadError}</p>
      ) : hasPassword === null ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Loader2 size={13} className="animate-spin" />
          در حال بررسی...
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          {hasPassword === false && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              با تعیین رمز عبور، علاوه بر کد یکبارمصرف می‌توانید با رمز هم وارد شوید.
            </p>
          )}

          {serverError && (
            <p
              role="alert"
              className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400"
            >
              {serverError}
            </p>
          )}

          {hasPassword && (
            <PasswordField
              floatingLabel
              label="رمز عبور فعلی"
              id="settings-current-password"
              name="current-password"
              autoComplete="current-password"
              placeholder="رمز عبور فعلی"
              value={currentPassword}
              disabled={saving}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.current) setErrors((c) => ({ ...c, current: undefined }));
              }}
              error={errors.current}
              reserveErrorSpace
            />
          )}

          <PasswordField
            floatingLabel
            label={hasPassword ? 'رمز عبور جدید' : 'رمز عبور'}
            id="settings-new-password"
            name="new-password"
            autoComplete="new-password"
            placeholder="یک رمز قوی انتخاب کنید"
            value={newPassword}
            disabled={saving}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.next || errors.confirm) {
                setErrors((c) => ({ ...c, next: undefined, confirm: undefined }));
              }
            }}
            error={errors.next}
            reserveErrorSpace
            showStrength
            showRequirements
          />

          <PasswordField
            floatingLabel
            label="تکرار رمز عبور"
            id="settings-confirm-password"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="رمز عبور را دوباره وارد کنید"
            value={confirmPassword}
            disabled={saving}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirm) setErrors((c) => ({ ...c, confirm: undefined }));
            }}
            onBlur={() => {
              if (confirmPassword && confirmPassword !== newPassword) {
                setErrors((c) => ({ ...c, confirm: 'با رمز عبور بالا یکسان نیست' }));
              }
            }}
            error={errors.confirm}
            reserveErrorSpace
          />

          <Button type="submit" disabled={saving}>
            {saving ? 'در حال ذخیره…' : hasPassword ? 'تغییر رمز عبور' : 'تعیین رمز عبور'}
          </Button>

          {saved && (
            <span className="flex items-center gap-1 text-xs font-medium text-success-600 dark:text-success-500">
              <Check size={13} />
              رمز عبور ذخیره شد
            </span>
          )}
        </form>
      )}
    </div>
  );
}

export default PasswordSection;
