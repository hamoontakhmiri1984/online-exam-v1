import { useRef, useState, type FormEvent } from 'react';

import {
  detectIdentifierType,
  normalizeIdentifier,
  validateIdentifier,
} from '../../utils/identifier';

import Button from '../Button/Button';
import GoogleAccess from '../GoogleAccess/GoogleAccess';
import TextBox from '../TextBox/TextBox';

type Props = {
  busy?: boolean;
  identifier: string;
  onIdentifierChange: (value: string) => void;
  onContinue: (normalizedIdentifier: string) => void;
  onSuccess: (completed: boolean) => void;
};

function IdentifierStep({
  busy = false,
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

    if (error) {
      setError('');
    }
  }

  function handleBlur() {
    if (!identifier.trim() && !submitted) {
      return;
    }

    setError(validateIdentifier(identifier) ?? '');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
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
      {!googleActive && (
        <>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <TextBox
                ref={inputRef}
                type="text"
                id="login-identifier"
                name="username"
                autoComplete="username"
                placeholder="شماره تماس یا پست الکترونیکی"
                floatingLabel="شماره تماس یا پست الکترونیکی"
                disabled={busy}
                value={identifier}
                onChange={handleChange}
                onBlur={handleBlur}
                error={error}
                reserveErrorSpace
                ltrInput
              />
            </div>

            <Button type="submit" disabled={busy}>
              {busy ? 'در حال بررسی…' : 'ادامه'}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span>یا</span>
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>
        </>
      )}
      {!busy && (
        <GoogleAccess onSuccess={onSuccess} onFlowChange={setGoogleActive} />
      )}
    </div>
  );
}

export default IdentifierStep;
