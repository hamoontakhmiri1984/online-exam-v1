import { useEffect, useState } from 'react';
import { RotateCw, Loader2 } from 'lucide-react';
import { getCaptcha, type CaptchaAnswer } from '../../api/authApi';

type CaptchaProps = {
  // برخلاف نسخه‌ی قبلی (که فقط true/false اعتبار محلی رو گزارش می‌داد)،
  // الان چون تایید واقعی سمت سرور انجام می‌شه، وقتی چالش آماده و جواب
  // پر شده باشه شیء {captchaId, captchaAnswer} رو بالا می‌فرسته (که باید
  // مستقیم به بدنه‌ی درخواست لاگین/ثبت‌نام/OTP اضافه بشه)، وگرنه null
  onChange: (value: CaptchaAnswer | null) => void;
  // هر بار که این عدد تغییر کنه، چالش جدید از سرور گرفته و ورودی پاک می‌شه
  // (سرور کپچا رو یک‌بارمصرف می‌کنه، پس بعد از هر تلاش ناموفق باید ریست بشه)
  resetSignal?: number;
};

function Captcha({ onChange, resetSignal = 0 }: CaptchaProps) {
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [svg, setSvg] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadChallenge() {
    setLoading(true);
    setError('');
    setAnswer('');
    setCaptchaId(null);
    onChange(null);
    try {
      const challenge = await getCaptcha();
      setCaptchaId(challenge.captchaId);
      setSvg(challenge.svg);
    } catch {
      setError('بارگذاری تصویر امنیتی ممکن نشد');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  function handleAnswerChange(raw: string) {
    setAnswer(raw);
    if (captchaId && raw.trim()) {
      onChange({ captchaId, captchaAnswer: raw.trim() });
    } else {
      onChange(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600 dark:text-gray-300">
        کد امنیتی داخل تصویر رو وارد کن
      </label>
      <div dir="ltr" className="flex items-center gap-2">
        <div className="flex h-14 w-42 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
          {loading ? (
            <Loader2 size={18} className="animate-spin text-gray-400" />
          ) : error ? (
            <span className="px-2 text-center text-xs text-danger-500">
              {error}
            </span>
          ) : (
            // eslint-disable-next-line react/no-danger
            <div
              className="[&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
        <input
          type="text"
          inputMode="text"
          placeholder="کد تصویر"
          value={answer}
          disabled={loading || !!error}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className="w-24 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-3 py-2.5 text-sm text-center outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition disabled:opacity-60"
        />
        <button
          type="button"
          onClick={loadChallenge}
          title="چالش جدید"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
        >
          <RotateCw size={16} />
        </button>
      </div>
    </div>
  );
}

export default Captcha;
