import { Mail, User } from 'lucide-react';

import Button from '../Button/Button';
import PasswordField from '../PasswordField/PasswordField';
import TextBox from '../TextBox/TextBox';

type IdentityStepProps = {
  name: string;
  identifier: string;
  password: string;
  confirmPassword: string;

  onNameChange: (value: string) => void;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;

  onBack: () => void;
  onNext: () => void;
};

function IdentityStep({
  name,
  identifier,
  password,
  confirmPassword,
  onNameChange,
  onIdentifierChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onBack,
  onNext,
}: IdentityStepProps) {
  const passwordMismatch =
    confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="signup-name"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          نام و نام خانوادگی
        </label>

        <TextBox
          type="text"
          id="signup-name"
          name="name"
          autoComplete="name"
          autoFocus
          placeholder="مثلاً علی رضایی"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          icon={<User size={16} />}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="signup-identifier"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          ایمیل یا شماره موبایل
        </label>

        <TextBox
          type="text"
          id="signup-identifier"
          name="username"
          autoComplete="username"
          placeholder="مثلاً 0912xxxxxxx یا name@email.com"
          value={identifier}
          onChange={(event) => onIdentifierChange(event.target.value)}
          icon={<Mail size={16} />}
        />
      </div>

      <PasswordField
        label="رمز عبور"
        id="signup-password"
        name="new-password"
        autoComplete="new-password"
        placeholder="حداقل ۶ کاراکتر، ترکیبی از حرف و عدد"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        showStrength
      />

      <PasswordField
        label="تکرار رمز عبور"
        id="signup-confirm-password"
        name="new-password"
        autoComplete="new-password"
        placeholder="دوباره وارد کن"
        value={confirmPassword}
        onChange={(event) => onConfirmPasswordChange(event.target.value)}
        error={passwordMismatch ? 'با رمز عبور بالا یکسان نیست' : undefined}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          قبلی
        </button>

        <div className="flex-[2]">
          <Button type="button" onClick={onNext}>
            بعدی
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IdentityStep;
