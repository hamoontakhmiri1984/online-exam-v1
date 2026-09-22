import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { ICON_NAMES, resolveIcon, DEFAULT_ICON_NAME } from '../../../constants/iconRegistry';

type Pillar = { icon: string; title: string; description: string };

type AboutSectionFormProps = {
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

function readPillars(data: Record<string, unknown>): Pillar[] {
  const value = data.pillars;
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      icon: typeof v.icon === 'string' ? v.icon : DEFAULT_ICON_NAME,
      title: typeof v.title === 'string' ? v.title : '',
      description: typeof v.description === 'string' ? v.description : '',
    }));
}

function AboutSectionForm({ initialData, saving, onSave }: AboutSectionFormProps) {
  const [title, setTitle] = useState(() => readString(initialData, 'title'));
  const [description, setDescription] = useState(() =>
    readString(initialData, 'description')
  );
  const [pillars, setPillars] = useState<Pillar[]>(() => readPillars(initialData));

  function updatePillar(index: number, patch: Partial<Pillar>) {
    setPillars((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePillar(index: number) {
    setPillars((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      title: title.trim(),
      description: description.trim(),
      pillars: pillars.map((p) => ({
        icon: p.icon,
        title: p.title.trim(),
        description: p.description.trim(),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>عنوان</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>متن</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={`${inputClass} resize-y`}
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className={labelClass}>ستون‌ها</label>
        {pillars.map((pillar, index) => {
          const Icon = resolveIcon(pillar.icon);
          return (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <Icon size={16} />
                  </div>
                  <select
                    value={pillar.icon}
                    onChange={(e) => updatePillar(index, { icon: e.target.value })}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {ICON_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removePillar(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-950/40"
                >
                  <X size={14} />
                </button>
              </div>

              <input
                value={pillar.title}
                onChange={(e) => updatePillar(index, { title: e.target.value })}
                placeholder="عنوان"
                className={inputClass}
              />
              <textarea
                value={pillar.description}
                onChange={(e) => updatePillar(index, { description: e.target.value })}
                placeholder="توضیح"
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </div>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setPillars((prev) => [
              ...prev,
              { icon: DEFAULT_ICON_NAME, title: '', description: '' },
            ])
          }
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400"
        >
          <Plus size={13} />
          افزودنِ ستون
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

export default AboutSectionForm;
