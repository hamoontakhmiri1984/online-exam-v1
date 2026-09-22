import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';

type LinkItem = { label: string; href: string };
type SocialLinkItem = { platform: string; href: string };

type FooterSectionFormProps = {
  initialData: Record<string, unknown>;
  saving: boolean;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
};

const SOCIAL_PLATFORMS = ['Instagram', 'Telegram', 'LinkedIn', 'TwitterX', 'YouTube'];

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-brand-900';
const labelClass = 'text-xs font-semibold text-gray-600 dark:text-gray-300';

function readString(data: Record<string, unknown>, key: string, fallback = ''): string {
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

function readLinks(data: Record<string, unknown>): LinkItem[] {
  const value = data.links;
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      label: typeof v.label === 'string' ? v.label : '',
      href: typeof v.href === 'string' ? v.href : '',
    }));
}

function readSocialLinks(data: Record<string, unknown>): SocialLinkItem[] {
  const value = data.socialLinks;
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      platform: typeof v.platform === 'string' ? v.platform : SOCIAL_PLATFORMS[0],
      href: typeof v.href === 'string' ? v.href : '',
    }));
}

function FooterSectionForm({ initialData, saving, onSave }: FooterSectionFormProps) {
  const [description, setDescription] = useState(() =>
    readString(initialData, 'description')
  );
  const [copyrightText, setCopyrightText] = useState(() =>
    readString(initialData, 'copyrightText')
  );
  const [links, setLinks] = useState<LinkItem[]>(() => readLinks(initialData));
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(() =>
    readSocialLinks(initialData)
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      description: description.trim(),
      copyrightText: copyrightText.trim(),
      links: links.map((l) => ({ label: l.label.trim(), href: l.href.trim() })),
      socialLinks: socialLinks.map((s) => ({ platform: s.platform, href: s.href.trim() })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>متنِ زیرِ لوگو</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`${inputClass} resize-y`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>لینک‌های ناوبری</label>
        {links.map((link, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={link.label}
              onChange={(e) =>
                setLinks((prev) =>
                  prev.map((l, i) => (i === index ? { ...l, label: e.target.value } : l))
                )
              }
              placeholder="برچسب"
              className={`${inputClass} sm:w-40`}
            />
            <input
              value={link.href}
              onChange={(e) =>
                setLinks((prev) =>
                  prev.map((l, i) => (i === index ? { ...l, href: e.target.value } : l))
                )
              }
              placeholder="#features"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:bg-danger-50 hover:text-danger-600 dark:border-gray-600 dark:hover:bg-danger-950/40"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLinks((prev) => [...prev, { label: '', href: '' }])}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400"
        >
          <Plus size={13} />
          افزودنِ لینک
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>شبکه‌های اجتماعی</label>
        {socialLinks.map((social, index) => (
          <div key={index} className="flex gap-2">
            <select
              value={social.platform}
              onChange={(e) =>
                setSocialLinks((prev) =>
                  prev.map((s, i) =>
                    i === index ? { ...s, platform: e.target.value } : s
                  )
                )
              }
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-36"
            >
              {SOCIAL_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
            <input
              value={social.href}
              onChange={(e) =>
                setSocialLinks((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, href: e.target.value } : s))
                )
              }
              placeholder="https://..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={() =>
                setSocialLinks((prev) => prev.filter((_, i) => i !== index))
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:bg-danger-50 hover:text-danger-600 dark:border-gray-600 dark:hover:bg-danger-950/40"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setSocialLinks((prev) => [...prev, { platform: SOCIAL_PLATFORMS[0], href: '' }])
          }
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400"
        >
          <Plus size={13} />
          افزودنِ شبکه
        </button>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-96">
        <label className={labelClass}>متنِ کپی‌رایت</label>
        <input
          value={copyrightText}
          onChange={(e) => setCopyrightText(e.target.value)}
          className={inputClass}
          placeholder="© ۱۴۰۵ سامانه آزمون آنلاین. تمامی حقوق محفوظ است."
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

export default FooterSectionForm;
