import type { Ref } from 'react';
import { Check, Circle } from 'lucide-react';

import TextBox from '../TextBox/TextBox';
import { getPasswordStrength } from './passwordStrength';

type PasswordFieldProps = {
  floatingLabel?: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  showStrength?: boolean;
  showRequirements?: boolean;
  reserveErrorSpace?: boolean;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
};

// Keep these rules aligned with the server password policy.
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'حداقل ۱۰ کاراکتر', test: (v: string) => v.length >= 10 },
  { id: 'letter', label: 'یک حرف انگلیسی', test: (v: string) => /[A-Za-z]/.test(v) },
  { id: 'digit', label: 'یک عدد', test: (v: string) => /\d/.test(v) },
] as const;

function PasswordField({
  floatingLabel = false,
  label,
  placeholder,
  value,
  onChange,
  error,
  id,
  name,
  autoComplete,
  autoFocus,
  showStrength = false,
  showRequirements = false,
  reserveErrorSpace = false,
  onBlur,
  disabled,
  ref,
}: PasswordFieldProps) {
  const strength = showStrength ? getPasswordStrength(value) : null;

  return (
    <div className="flex flex-col gap-1">
      {!floatingLabel && <label htmlFor={id} className="text-sm text-gray-600 dark:text-gray-300">
        {label}
      </label>}
      <TextBox
        ref={ref}
        type="password"
        floatingLabel={floatingLabel ? label : undefined}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        id={id}
        name={name}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        toggleablePassword
        error={error}
        reserveErrorSpace={reserveErrorSpace}
      />
      {strength && value && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex gap-1 flex-1">
            {(() => {
              const filledBars = Math.max(strength.level, 1);
              return [0, 1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    bar < filledBars
                      ? strength.colorClass
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              ));
            })()}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {strength.label}
          </span>
        </div>
      )}
      {showRequirements && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
          {PASSWORD_REQUIREMENTS.map((rule) => {
            const met = rule.test(value);

            return (
              <li
                key={rule.id}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  met
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {met ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  <Circle size={12} aria-hidden="true" />
                )}
                <span>{rule.label}</span>
                <span className="sr-only">
                  {met ? '(برقرار است)' : '(برقرار نیست)'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PasswordField;
