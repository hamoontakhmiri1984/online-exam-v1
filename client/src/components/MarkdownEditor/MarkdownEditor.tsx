import { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Link2,
  Eye,
  Pencil,
  type LucideIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** تعداد ردیفِ اولیه‌ی textarea */
  rows?: number;
  error?: string;
};

type ToolbarAction = {
  label: string;
  icon: LucideIcon;
  // سینتکسِ Markdown رو دورِ متنِ انتخاب‌شده می‌ذاره (یا اگه چیزی
  // انتخاب نشده بود، یه متنِ نمونه inject می‌کنه)
  before: string;
  after: string;
  placeholder: string;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'بولد', icon: Bold, before: '**', after: '**', placeholder: 'متن پررنگ' },
  { label: 'ایتالیک', icon: Italic, before: '_', after: '_', placeholder: 'متن مورب' },
  { label: 'عنوان', icon: Heading2, before: '## ', after: '', placeholder: 'عنوان' },
  { label: 'لینک', icon: Link2, before: '[', after: '](https://)', placeholder: 'متنِ لینک' },
];

// روی خودِ textarea سینتکسِ Markdown رو دورِ انتخابِ فعلی می‌ذاره و همون‌جا
// نگه می‌داره که کاربر بتونه بی‌وقفه تایپ کنه (به‌جای پاک‌کردنِ فوکوس)
function injectSyntax(
  textarea: HTMLTextAreaElement,
  action: ToolbarAction,
  value: string,
  onChange: (value: string) => void
) {
  const { selectionStart, selectionEnd } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || action.placeholder;
  const next =
    value.slice(0, selectionStart) +
    action.before +
    selected +
    action.after +
    value.slice(selectionEnd);
  onChange(next);

  requestAnimationFrame(() => {
    textarea.focus();
    const cursorStart = selectionStart + action.before.length;
    textarea.setSelectionRange(cursorStart, cursorStart + selected.length);
  });
}

function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 12,
  error,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // تو صفحه‌های کوچیک (موبایل) جا برای textarea + پیش‌نمایشِ هم‌زمان نیست؛
  // یه تبِ ساده بینِ «نوشتن»/«پیش‌نمایش» سوییچ می‌کنه. تو دسکتاپ هردو کنارِ
  // همدیگه دیده می‌شن
  const [mobileTab, setMobileTab] = useState<'write' | 'preview'>('write');

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="flex items-center gap-1">
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              aria-label={action.label}
              onClick={() => {
                const textarea = textareaRef.current;
                if (!textarea) return;
                injectSyntax(textarea, action, value, onChange);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-brand-400"
            >
              <action.icon size={15} />
            </button>
          ))}
        </div>

        <div className="flex gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('write')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
              mobileTab === 'write'
                ? 'bg-white text-brand-600 dark:bg-gray-700 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Pencil size={12} />
            نوشتن
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
              mobileTab === 'preview'
                ? 'bg-white text-brand-600 dark:bg-gray-700 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Eye size={12} />
            پیش‌نمایش
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-gray-200 rounded-b-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700 md:grid-cols-2 md:divide-x md:divide-y-0 md:divide-x-reverse">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          dir="rtl"
          className={`resize-y bg-white px-4 py-3 text-sm leading-7 text-gray-800 outline-none dark:bg-gray-900 dark:text-white ${
            mobileTab === 'preview' ? 'hidden md:block' : ''
          }`}
        />

        <div
          className={`max-w-none overflow-y-auto bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200 [&_a]:text-brand-600 [&_a]:underline [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-bold [&_li]:mr-5 [&_ol]:list-decimal [&_p]:mb-2 [&_strong]:font-bold [&_ul]:list-disc ${
            mobileTab === 'write' ? 'hidden md:block' : ''
          }`}
        >
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              پیش‌نمایش همین‌جا نشون داده می‌شه...
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>}
    </div>
  );
}

export default MarkdownEditor;
