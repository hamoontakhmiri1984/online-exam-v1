import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

import { detectIdentifierType } from '../../utils/identifier';

import Button from '../Button/Button';

type Props = {
  /** شناسه‌ی نرمال‌شده (مرحله‌ی قبل) */
  identifier: string;
  onChoosePassword: () => void;
  onChooseCode: () => void;
  /** برگشت به مرحله‌ی اول برای ویرایش شناسه */
  onEdit: () => void;
  /** true وقتی درخواست ارسال کد در جریانه */
  codeLoading?: boolean;
};

function MethodStep({
  identifier,
  onChoosePassword,
  onChooseCode,
  onEdit,
  codeLoading = false,
}: Props) {
  const headingRef = useRef<HTMLParagraphElement>(null);

  // با ورود به مرحله، فوکوس می‌ره روی عنوان تا screen reader تغییر مرحله رو اعلام کنه
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const channelLabel =
    detectIdentifierType(identifier) === 'PHONE' ? 'پیامک' : 'ایمیل';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
        <span
          dir="ltr"
          className="truncate text-sm text-gray-800 dark:text-gray-100"
        >
          {identifier}
        </span>

        <button
          type="button"
          onClick={onEdit}
          disabled={codeLoading}
          className="shrink-0 cursor-pointer text-xs font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-brand-400"
        >
          ویرایش
        </button>
      </div>

      <p
        ref={headingRef}
        tabIndex={-1}
        className="text-sm text-gray-600 outline-none dark:text-gray-300"
      >
        روش ورود را انتخاب کنید
      </p>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          onClick={onChoosePassword}
          disabled={codeLoading}
        >
          ورود با رمز عبور
        </Button>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onChooseCode}
            disabled={codeLoading}
            className="w-full cursor-pointer rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {codeLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                در حال ارسال کد...
              </span>
            ) : (
              'دریافت کد تأیید'
            )}
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            کد تأیید با {channelLabel} ارسال می‌شود
          </p>
        </div>
      </div>
    </div>
  );
}

export default MethodStep;