import { useRef, useState, type ChangeEvent } from 'react';
import { Mail, Smartphone, User } from 'lucide-react';

import {
  detectIdentifierType,
  normalizeIdentifier,
} from '../../utils/identifier';

import Button from '../Button/Button';
import PasswordField from '../PasswordField/PasswordField';
import TextBox from '../TextBox/TextBox';

import {
  IDENTITY_FIELD_ORDER,
  validateIdentity,
  validateIdentityField,
  type IdentityErrors,
  type IdentityField,
  type IdentityValues,
} from './signup.validation';

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
  /** شناسه‌ی معتبر و نرمال‌شده را تحویل می‌دهد */
  onNext: (normalizedIdentifier: string) => void;
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
  const [errors, setErrors] = useState<IdentityErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<IdentityField, React.RefObject<HTMLInputElement | null>> = {
    name: nameRef,
    identifier: identifierRef,
    password: passwordRef,
    confirmPassword: confirmPasswordRef,
  };

  const values: IdentityValues = { name, identifier, password, confirmPassword };

  function setFieldError(field: IdentityField, message: string | null) {
    setErrors((current) => {
      const next = { ...current };

      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }

      return next;
    });
  }

  // با شروع تایپ، خطای همان فیلد پاک می‌شود
  function clearFieldError(field: IdentityField) {
    if (errors[field]) {
      setFieldError(field, null);
    }
  }

  // بعد از اولین ارسال، با خروج از فیلد دوباره بررسی می‌شود
  function handleBlur(field: IdentityField) {
    if (!submitted) {
      return;
    }

    setFieldError(field, validateIdentityField(field, values));
  }

  function handleChange(
    field: IdentityField,
    onChange: (value: string) => void
  ) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
      clearFieldError(field);

      // تغییر رمز، خطای «یکسان نیست» در فیلد تکرار را کهنه می‌کند
      if (field === 'password') {
        clearFieldError('confirmPassword');
      }
    };
  }

  function handleSubmit() {
    setSubmitted(true);

    const nextErrors = validateIdentity(values);
    setErrors(nextErrors);

    const firstInvalid = IDENTITY_FIELD_ORDER.find(
      (field) => nextErrors[field]
    );

    if (firstInvalid) {
      fieldRefs[firstInvalid].current?.focus();
      return;
    }

    const type = detectIdentifierType(identifier);

    if (!type) {
      return;
    }

    onNext(normalizeIdentifier(identifier, type));
  }

  const identifierIcon = /^[+\d\u06F0-\u06F9\u0660-\u0669]/.test(
    identifier.trim()
  ) ? (
    <Smartphone size={16} />
  ) : (
    <Mail size={16} />
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="signup-name"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          نام و نام خانوادگی
        </label>

        <TextBox
          ref={nameRef}
          type="text"
          id="signup-name"
          name="name"
          autoComplete="name"
          autoFocus
          placeholder="مثلاً علی رضایی"
          value={name}
          onChange={handleChange('name', onNameChange)}
          onBlur={() => handleBlur('name')}
          icon={<User size={16} />}
          error={errors.name}
          reserveErrorSpace
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="signup-identifier"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          ایمیل یا شماره تماس
        </label>

        <TextBox
          ref={identifierRef}
          type="text"
          id="signup-identifier"
          name="username"
          autoComplete="username"
          placeholder="مثلاً ali@example.com یا 09121234567"
          value={identifier}
          onChange={handleChange('identifier', onIdentifierChange)}
          onBlur={() => handleBlur('identifier')}
          icon={identifierIcon}
          error={errors.identifier}
          reserveErrorSpace
          ltrInput
        />
      </div>

      <PasswordField
        ref={passwordRef}
        label="رمز عبور"
        id="signup-password"
        name="new-password"
        autoComplete="new-password"
        placeholder="یک رمز قوی انتخاب کنید"
        value={password}
        onChange={handleChange('password', onPasswordChange)}
        onBlur={() => handleBlur('password')}
        error={errors.password}
        reserveErrorSpace
        showStrength
        showRequirements
      />

      <PasswordField
        ref={confirmPasswordRef}
        label="تکرار رمز عبور"
        id="signup-confirm-password"
        name="confirm-password"
        autoComplete="new-password"
        placeholder="رمز عبور را دوباره وارد کنید"
        value={confirmPassword}
        onChange={handleChange('confirmPassword', onConfirmPasswordChange)}
        onBlur={() => handleBlur('confirmPassword')}
        error={errors.confirmPassword}
        reserveErrorSpace
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
          <Button type="submit">بعدی</Button>
        </div>
      </div>
    </form>
  );
}

export default IdentityStep;