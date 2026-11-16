import { notifySaveError } from '../../../components/Toast/Toast';
import { useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { Plus, X, Save, RotateCcw } from 'lucide-react';

type HeroSectionFormProps = {
  initialData: Record<string, unknown>;
  saving: boolean;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
};

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-brand-900';
const labelClass = 'text-xs font-semibold text-gray-600 dark:text-gray-300';

function readString(data: Record<string, unknown>, key: string, fallback = ''): string {
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

function readStringArray(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function HeroSectionForm({ initialData, saving, onSave }: HeroSectionFormProps) {
  const [formError, setFormError] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [title, setTitle] = useState(() => readString(initialData, 'title'));
  const [subtitle, setSubtitle] = useState(() => readString(initialData, 'subtitle'));
  const [ctaText, setCtaText] = useState(() =>
    readString(initialData, 'ctaText')
  );
  const [trustPoints, setTrustPoints] = useState<string[]>(() =>
    readStringArray(initialData, 'trustPoints')
  );

  async function restoreDefaultHero() {
    if (saving) return;
    const defaults = {
      title: 'برگزاری آزمون آنلاین، به سبک آینده',
      subtitle: 'بانک سؤال بساز، آزمون زمان‌دار طراحی کن و نتیجه را لحظه‌ای ببین؛ همه‌چیز در یک پنل ساده و حرفه‌ای.',
      ctaText: 'شروع رایگان',
      trustPoints: ['بدون نیاز به کارت بانکی', 'راه‌اندازی در کمتر از ۲ دقیقه'],
    };
    setFormError('');
    const saved = await onSave(defaults);
    if (!saved) {
      setFormError('بازگردانی انجام نشد؛ دوباره تلاش کنید.');
      notifySaveError('بازگردانی انجام نشد؛ دوباره تلاش کنید.');
      return;
    }
    setTitle(defaults.title);
    setSubtitle(defaults.subtitle);
    setCtaText(defaults.ctaText);
    setTrustPoints(defaults.trustPoints);
    setShowRestoreConfirm(false);
  }

  function updatePoint(index: number, value: string) {
    setTrustPoints((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function removePoint(index: number) {
    setTrustPoints((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !subtitle.trim() || !ctaText.trim() || trustPoints.some(p => !p.trim())) {
      setFormError('عنوان، زیرعنوان، متن دکمه و نکته‌های افزوده‌شده را کامل کنید.');
      notifySaveError('عنوان، زیرعنوان، متن دکمه و نکته‌های افزوده‌شده را کامل کنید.');
      return;
    }
    setFormError('');
    const saved = await onSave({
      title: title.trim(),
      subtitle: subtitle.trim(),
      ctaText: ctaText.trim(),
      trustPoints: trustPoints.map((p) => p.trim()).filter(Boolean),
    });
    if (!saved) setFormError('ذخیره انجام نشد؛ لطفاً دوباره تلاش کنید.');
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Modal isOpen={showRestoreConfirm} onClose={() => { if (!saving) setShowRestoreConfirm(false); }} label="تأیید بازگردانی متن استاندارد">
        <div dir="rtl" className="space-y-4 text-right">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              <RotateCcw size={21} />
            </span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">بازگردانی متن استاندارد</h2>
          </div>
          <p className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-4 text-sm leading-7 text-gray-700 dark:border-violet-400/20 dark:bg-violet-400/5 dark:text-gray-200">
            عنوان، زیرعنوان، متن دکمه و نکات بخش اول به متن استاندارد بازگردند؟ این تغییر به‌صورت پیش‌نویس ذخیره می‌شود و تا زمان انتشار در صفحه اصلی نمایش داده نخواهد شد.
          </p>
          <div className="flex gap-3">
            <button type="button" disabled={saving} onClick={() => setShowRestoreConfirm(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">انصراف</button>
            <button type="button" disabled={saving} onClick={() => void restoreDefaultHero()} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? 'در حال بازگردانی…' : 'تأیید بازگردانی'}
            </button>
          </div>
        </div>
      </Modal>
      {formError && <p role="alert" className="form-inline-error">{formError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200/50 bg-violet-50/40 px-4 py-3 text-xs text-gray-600 dark:border-violet-400/20 dark:bg-violet-400/5 dark:text-gray-300">
        <span>این بخش پیش‌نویس است؛ تا زمان انتشار، متن صفحه اصلی تغییر نمی‌کند.</span>
        <button type="button" disabled={saving} onClick={() => setShowRestoreConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/60 px-3 py-2 text-violet-700 hover:bg-violet-100/70 disabled:opacity-50 dark:text-violet-200 dark:hover:bg-violet-400/10"><RotateCcw size={14}/>بازگردانی متن استاندارد</button>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>عنوان اصلی</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="برگزاری آزمون آنلاین، بدون دردسر"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>زیرعنوان</label>
        <textarea
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={3}
          className={`${inputClass} resize-y`}
          placeholder="بانک سوال بساز، آزمون زمان‌دار طراحی کن..."
        />
      </div>

      <div className="flex flex-col gap-1.5 sm:w-64">
        <label className={labelClass}>متنِ دکمه‌ی CTA</label>
        <input
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>نکته‌های اعتمادساز</label>
        {trustPoints.map((point, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={point}
              onChange={(e) => updatePoint(index, e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removePoint(index)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:bg-danger-50 hover:text-danger-600 dark:border-gray-600 dark:hover:bg-danger-950/40"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTrustPoints((prev) => [...prev, ''])}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400"
        >
          <Plus size={13} />
          افزودنِ نکته
        </button>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save size={15} />
        {saving ? 'در حال ذخیره...' : 'ذخیره'}
      </button>
    </form>
  );
}

export default HeroSectionForm;
