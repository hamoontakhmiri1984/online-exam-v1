import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';

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
  const [title, setTitle] = useState(() => readString(initialData, 'title'));
  const [subtitle, setSubtitle] = useState(() => readString(initialData, 'subtitle'));
  const [ctaText, setCtaText] = useState(() =>
    readString(initialData, 'ctaText', 'شروع رایگان')
  );
  const [trustPoints, setTrustPoints] = useState<string[]>(() =>
    readStringArray(initialData, 'trustPoints')
  );

  function updatePoint(index: number, value: string) {
    setTrustPoints((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function removePoint(index: number) {
    setTrustPoints((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      title: title.trim(),
      subtitle: subtitle.trim(),
      ctaText: ctaText.trim(),
      trustPoints: trustPoints.map((p) => p.trim()).filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
