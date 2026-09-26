import Button from '../../Button/Button';
import OtpInput from '../../OtpInput/OtpInput';
import Captcha from '../../Captcha/Captcha';
import { OTP_CODE_LENGTH } from '../../../constants/otp';
import { formatCountdown } from '../../../utils/formatCountdown';
import type { CaptchaAnswer } from '../../../api/authApi';

type Props = {
  identifier: string;
  code: string;
  onCodeChange: (value: string) => void;
  hasError: boolean;
  cooldown: number;
  captcha: CaptchaAnswer | null;
  onCaptchaChange: (value: CaptchaAnswer | null) => void;
  captchaResetSignal: number;
  resending: boolean;
  onResend: () => void;
  loading: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
};

function CodeStep({
  identifier,
  code,
  onCodeChange,
  hasError,
  cooldown,
  captcha,
  onCaptchaChange,
  captchaResetSignal,
  resending,
  onResend,
  loading,
  onSubmit,
  onBack,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        کد تایید به{' '}
        <span
          dir="ltr"
          className="font-medium text-gray-700 dark:text-gray-200"
        >
          {identifier}
        </span>{' '}
        ارسال شد
      </p>

      <OtpInput
        length={OTP_CODE_LENGTH}
        value={code}
        onChange={onCodeChange}
        error={hasError}
      />

      {cooldown > 0 ? (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          ارسال مجدد در {formatCountdown(cooldown)}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Captcha onChange={onCaptchaChange} resetSignal={captchaResetSignal} />
          <button
            type="button"
            onClick={onResend}
            disabled={resending || !captcha}
            className="cursor-pointer text-xs text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline dark:text-brand-400"
          >
            {resending ? 'در حال ارسال...' : 'ارسال مجدد کد'}
          </button>
        </div>
      )}

      <Button type="submit" disabled={loading || code.length !== OTP_CODE_LENGTH}>
        {loading ? 'در حال بررسی...' : 'تایید کد'}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-brand-600 hover:underline dark:text-brand-400 cursor-pointer"
      >
        بازگشت و اصلاح شناسه
      </button>
    </form>
  );
}

export default CodeStep;