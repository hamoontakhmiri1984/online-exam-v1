import { useState } from 'react';
import { Save } from 'lucide-react';

type NewsSectionFormProps = {
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

function NewsSectionForm({ initialData, saving, onSave }: NewsSectionFormProps) {
  const [title, setTitle] = useState(() => readString(initialData, 'title'));
  const [subtitle, setSubtitle] = useState(() => readString(initialData, 'subtitle'));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({ title: title.trim(), subtitle: subtitle.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
        کارت‌های خودِ اخبار از جدیدترین پست‌های بخشِ «بلاگ» میان - این بخش
        فقط عنوان و زیرعنوانِ بالای اون بخش رو کنترل می‌کنه.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>عنوان</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>زیرعنوان</label>
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className={inputClass}
        />
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

export default NewsSectionForm;
