import TextBox from '../TextBox/TextBox';
import { getPasswordStrength } from './passwordStrength';

type PasswordFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  /** نمایش نوار قدرت رمز - برای فیلد «رمز عبور» توی ثبت‌نام true، برای «تکرار رمز» یا فرم لاگین false */
  showStrength?: boolean;
};

function PasswordField({
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
}: PasswordFieldProps) {
  const strength = showStrength ? getPasswordStrength(value) : null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-gray-600 dark:text-gray-300">
        {label}
      </label>
      <TextBox
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        id={id}
        name={name}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        toggleablePassword
        error={error}
      />
      {strength && value && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex gap-1 flex-1">
            {(() => {
              // حداقل ۱ نوار همیشه پر می‌شه (تا وقتی چیزی تایپ شده، فیدبک بصری صفر نباشه)
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
    </div>
  );
}

export default PasswordField;
