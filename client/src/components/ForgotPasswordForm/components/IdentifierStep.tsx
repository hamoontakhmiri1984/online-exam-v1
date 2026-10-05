import { Mail } from 'lucide-react';
import Button from '../../Button/Button';
import TextBox from '../../TextBox/TextBox';
import Captcha from '../../Captcha/Captcha';
import type { CaptchaAnswer } from '../../../api/authApi';

type Props = {
  identifier: string;
  onIdentifierChange: (value: string) => void;
  captcha: CaptchaAnswer | null;
  captchaRequired: boolean;
  onCaptchaChange: (value: CaptchaAnswer | null) => void;
  captchaResetSignal: number;
  loading: boolean;
  onSubmit: (event: React.FormEvent) => void;
};

function IdentifierStep({
  identifier,
  onIdentifierChange,
  captcha,
  captchaRequired,
  onCaptchaChange,
  captchaResetSignal,
  loading,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset disabled={loading} className="contents">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="forgot-identifier"
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          ایمیل یا شماره موبایل
        </label>
        <TextBox
          type="text"
          id="forgot-identifier"
          name="username"
          autoComplete="username"
          autoFocus
          placeholder="مثلاً 0912xxxxxxx یا name@email.com"
          value={identifier}
          onChange={(e) => onIdentifierChange(e.target.value)}
          icon={<Mail size={16} />}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          همون ایمیل یا موبایلی که موقع ثبت‌نام استفاده کردی
        </p>
      </div>

      {captchaRequired && <Captcha onChange={onCaptchaChange} resetSignal={captchaResetSignal} />}

      <Button type="submit" disabled={loading || (captchaRequired && !captcha)}>
        {loading ? 'در حال ارسال کد...' : 'ارسال کد تایید'}
      </Button>
      </fieldset>
    </form>
  );
}

export default IdentifierStep;