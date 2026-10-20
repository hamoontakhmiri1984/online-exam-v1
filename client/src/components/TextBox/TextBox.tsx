import { useState, type ReactNode, type Ref } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type TextBoxProps = {
  floatingLabel?: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  icon?: ReactNode;
  toggleablePassword?: boolean;
  error?: string;
  reserveErrorSpace?: boolean;
  // Keep empty identifiers RTL for the label; switch typed email/phone values to LTR.
  ltrInput?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
};

function TextBox({
  floatingLabel,
  type,
  placeholder,
  value,
  onChange,
  id,
  name,
  autoComplete,
  autoFocus,
  icon,
  toggleablePassword = false,
  error,
  reserveErrorSpace = false,
  ltrInput = false,
  inputMode,
  maxLength,
  onBlur,
  disabled,
  ref,
}: TextBoxProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPasswordField = type === 'password';
  const resolvedType = isPasswordField && revealed ? 'text' : type;
  const showToggle = isPasswordField && toggleablePassword;

  const rightPadding = icon ? 'pr-10' : 'pr-4';
  const leftPadding = showToggle ? 'pl-10' : 'pl-4';

  const errorId = id ? `${id}-error` : undefined;
  const inputDirection = ltrInput ? (value ? 'ltr' : 'rtl') : undefined;
  const showErrorSlot = Boolean(error) || reserveErrorSpace;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={resolvedType}
          placeholder={floatingLabel ? ' ' : placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          id={id}
          name={name}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
          dir={inputDirection}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`peer w-full border rounded-xl ${floatingLabel ? 'h-14 pt-6 pb-1.5' : 'py-2.5'} text-sm outline-none transition duration-300 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white disabled:cursor-not-allowed disabled:opacity-60
            ${rightPadding} ${leftPadding}
            ${
              error
                ? 'border-danger-400 focus:border-danger-500 focus:ring-4 focus:ring-danger-50 dark:focus:ring-danger-950'
                : 'border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900'
            }`}
        />
        {floatingLabel && (
          <label htmlFor={id} className={`pointer-events-none absolute right-4 top-4 max-w-[calc(100%-2rem)] origin-right truncate text-sm leading-5 transition-[transform,color] duration-200 ease-out motion-reduce:transition-none ${focused || value ? '-translate-y-3 scale-[0.8]' : 'translate-y-0 scale-100'} ${error ? 'text-danger-600 dark:text-danger-400' : focused ? 'text-brand-600 dark:text-brand-300' : 'text-gray-500 dark:text-gray-300'} peer-autofill:-translate-y-3 peer-autofill:scale-[0.8]`}>
            {floatingLabel}
          </label>
        )}
        {isPasswordField && toggleablePassword && (
          <button
            type="button"
            onMouseDown={() => setRevealed(true)}
            onMouseUp={() => setRevealed(false)}
            onMouseLeave={() => setRevealed(false)}
            onTouchStart={(e) => {
              e.preventDefault();
              setRevealed(true);
            }}
            onTouchEnd={() => setRevealed(false)}
            onTouchCancel={() => setRevealed(false)}
            tabIndex={-1}
            disabled={disabled}
            className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer select-none"
            aria-label="نگه دارید تا رمز عبور نمایش داده شود"
          >
            {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {showErrorSlot && (
        <p
          id={errorId}
          aria-live="polite"
          className={`text-xs text-danger-600 dark:text-danger-400 ${
            reserveErrorSpace ? 'min-h-4' : ''
          }`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default TextBox;
