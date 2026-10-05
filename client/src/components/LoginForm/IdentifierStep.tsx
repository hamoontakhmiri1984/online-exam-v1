import { useRef, useState, type FormEvent } from 'react';
import { Mail, Smartphone } from 'lucide-react';

import {
  detectIdentifierType,
  normalizeIdentifier,
  validateIdentifier,
} from '../../utils/identifier';

import Button from '../Button/Button';
import GoogleAccess from '../GoogleAccess/GoogleAccess';
import TextBox from '../TextBox/TextBox';

type Props = {
  identifier: string;
  onIdentifierChange: (value: string) => void;
  /** شناسه‌ی معتبر و نرمال‌شده رو تحویل می‌ده */
  onContinue: (normalizedIdentifier: string) => void;
  onSuccess: (completed: boolean) => void;
};

// آیکن کنار فیلد بر اساس چیزی که کاربر تایپ کرده عوض می‌شه
function getIdentifierIcon(value: string) {
  if (value.includes('@')) {
    return <Mail size={16} />;
  }

  if (/^[+\d\u06F0-\u06F9\u0660-\u0669]/.test(value.trim())) {
    return <Smartphone size={16} />;
  }

  return <Mail size={16} />;
}

function IdentifierStep({
  identifier,
  onIdentifierChange,
  onContinue,
  onSuccess,
}: Props) {
  const [googleActive, setGoogleActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onIdentifierChange(event.target.value);

    // با شروع اصلاح، خطای قبلی پاک می‌شه
    if (error) {
      setError('');
    }
  }

  function handleBlur() {
    // قبل از اولین ارسال، روی فیلد خالی خطا نشون نمی‌دیم
    if (!identifier.trim() && !submitted) {
      return;
    }

    setError(validateIdentifier(identifier) ?? '');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const validationError = validateIdentifier(identifier);

    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    const type = detectIdentifierType(identifier);

    if (!type) {
      return;
    }

    onContinue(normalizeIdentifier(identifier, type));
  }

  return (
    <div className="flex flex-col gap-4">
      {!googleActive && <><form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="login-identifier"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            شماره موبایل یا ایمیل
          </label>

          <TextBox
            ref={inputRef}
            type="text"
            id="login-identifier"
            name="username"
            autoComplete="username"
            autoFocus
            placeholder="مثلاً 09123456789 یا name@example.com"
            value={identifier}
            onChange={handleChange}
            onBlur={handleBlur}
            icon={getIdentifierIcon(identifier)}
            error={error}
            reserveErrorSpace
            ltrInput
          />
        </div>

        <Button type="submit">ادامه</Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span>یا</span>
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      </>}
      <GoogleAccess onSuccess={onSuccess} onFlowChange={setGoogleActive} />
    </div>
  );
}

export default IdentifierStep;