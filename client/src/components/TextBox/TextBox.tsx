import { useState, type ReactNode, type Ref } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type TextBoxProps = {
  type: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** برای وصل‌کردن به <label htmlFor> - بدونش لیبل کلیک‌پذیر نیست و screen reader اسمی برای فیلد نداره */
  id?: string;
  name?: string;
  /** مقدار استاندارد autocomplete (مثلاً 'username', 'current-password') - برای پیشنهاد درستِ مدیر رمزهای مرورگر */
  autoComplete?: string;
  autoFocus?: boolean;
  /** آیکن سمت راست ورودی (در RTL یعنی ابتدای فیلد) */
  icon?: ReactNode;
  /**
   * فقط برای type="password" کاربرد داره؛ اگه true باشه یه دکمه‌ی
   * چشم برای نمایش/مخفی‌کردن رمز کنار فیلد اضافه می‌شه
   */
  toggleablePassword?: boolean;
  /** پیام خطای مختص همین فیلد (اختیاری) - حاشیه‌ی قرمز + متن زیر فیلد */
  error?: string;
  /**
   * اگه true باشه جای پیام خطا از قبل رزرو می‌شه تا با ظاهر/ناپدیدشدن خطا
   * فرم بالا و پایین نپره. پیش‌فرض false تا صفحه‌های قبلی تغییر نکنن.
   */
  reserveErrorSpace?: boolean;
  /**
   * برای ایمیل/شماره: تا وقتی فیلد خالیه راست‌چین می‌مونه (placeholder فارسی
   * درست دیده بشه)، با شروع تایپ چپ‌به‌راست می‌شه (ایمیل و رقم به‌هم نریزن)
   */
  ltrInput?: boolean;
  /** کیبورد مناسب موبایل (مثلاً numeric برای کد تایید) */
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  /** حداکثر تعداد کاراکتر مجاز */
  maxLength?: number;
  /** برای اعتبارسنجی بعد از خروج از فیلد */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** مثلاً هنگام ارسال فرم برای جلوگیری از تغییر و کلیک تکراری */
  disabled?: boolean;
  /** برای فوکوس‌کردن روی اولین فیلد خطادار بعد از ارسال */
  ref?: Ref<HTMLInputElement>;
};

function TextBox({
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
  const [revealed, setRevealed] = useState(false);
  const isPasswordField = type === 'password';
  const resolvedType = isPasswordField && revealed ? 'text' : type;
  const showToggle = isPasswordField && toggleablePassword;

  // راست فیلد (ابتدای متن در RTL): جا برای آیکن یا پدینگ معمولی
  const rightPadding = icon ? 'pr-10' : 'pr-4';
  // چپ فیلد (انتهای متن در RTL): جا برای دکمه‌ی toggle یا پدینگ معمولی
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
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
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
          className={`w-full border rounded-xl py-2.5 text-sm outline-none transition duration-300 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white disabled:cursor-not-allowed disabled:opacity-60
            ${rightPadding} ${leftPadding}
            ${
              error
                ? 'border-danger-400 focus:border-danger-500 focus:ring-4 focus:ring-danger-50 dark:focus:ring-danger-950'
                : 'border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900'
            }`}
        />
        {isPasswordField && toggleablePassword && (
          <button
            type="button"
            // به‌جای toggle با کلیک: تا وقتی دکمه پایینه رمز نمایش داده می‌شه،
            // با ول‌کردن (یا خروج ماوس از روی دکمه) دوباره مخفی می‌شه
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
        // این عنصر همیشه توی DOM می‌مونه (وقتی reserveErrorSpace فعاله) تا
        // aria-live تغییر متن رو اعلام کنه و ارتفاع فرم هم ثابت بمونه
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