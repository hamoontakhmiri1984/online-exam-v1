import { useRef } from 'react';

import { toLatinDigits } from '../../utils/identifier';

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
};

function digitsOnly(raw: string): string {
  return toLatinDigits(raw).replace(/\D/g, '');
}

/**
 * ۶ خانه‌ی جدا برای وارد کردن کد تأیید - به‌جای یک TextBox معمولی.
 * تایپ هر رقم خودکار می‌ره خانه‌ی بعد، Backspace رو خانه‌ی خالی می‌ره عقب،
 * و Paste کردن یه کد کامل بین خانه‌ها پخش می‌شه.
 */
function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function setDigitAt(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').slice(0, length));
  }

  function focusIndex(index: number) {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }

  function handleChange(index: number, raw: string) {
    const cleaned = digitsOnly(raw);
    if (!cleaned) {
      setDigitAt(index, '');
      return;
    }
    if (cleaned.length > 1) {
      // کاربر چندتا رقم با هم تایپ/چسبونده - پخششون کن بین خانه‌ی فعلی و بعدی‌ها
      const next = digits.slice();
      let cursor = index;
      for (const d of cleaned) {
        if (cursor >= length) break;
        next[cursor] = d;
        cursor += 1;
      }
      onChange(next.join('').slice(0, length));
      focusIndex(Math.min(cursor, length - 1));
      return;
    }
    setDigitAt(index, cleaned);
    if (index < length - 1) focusIndex(index + 1);
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusIndex(index - 1);
    } else if (event.key === 'ArrowLeft' && index < length - 1) {
      focusIndex(index + 1);
    } else if (event.key === 'ArrowRight' && index > 0) {
      focusIndex(index - 1);
    }
  }

  function handlePaste(
    index: number,
    event: React.ClipboardEvent<HTMLInputElement>
  ) {
    const pasted = digitsOnly(event.clipboardData.getData('text'));
    if (!pasted) return;
    event.preventDefault();
    handleChange(index, pasted);
  }

  return (
    <div dir="ltr" className="flex justify-center gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-11 rounded-xl border text-center text-lg font-semibold outline-none transition duration-300 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white
            ${
              error
                ? 'border-danger-400 focus:border-danger-500 focus:ring-4 focus:ring-danger-50 dark:focus:ring-danger-950'
                : 'border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900'
            }
            disabled:opacity-60`}
        />
      ))}
    </div>
  );
}

export default OtpInput;
