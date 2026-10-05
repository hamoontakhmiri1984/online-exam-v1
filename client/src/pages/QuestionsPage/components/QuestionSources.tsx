import { BookOpen, FileSpreadsheet, PenLine } from 'lucide-react';

type Props = {
  onManual: () => void;
  onExcel: () => void;
  onBank: () => void;
  disabled?: boolean;
};
export default function QuestionSources({
  onManual,
  onExcel,
  onBank,
  disabled,
}: Props) {
  const sources = [
    {
      title: 'نوشتن سؤال',
      description: 'متن، گزینه‌ها و پاسخ صحیح را وارد کنید.',
      icon: PenLine,
      action: onManual,
    },
    {
      title: 'ورود از اکسل',
      description: 'قالب را بگیرید و چند سؤال را یک‌جا اضافه کنید.',
      icon: FileSpreadsheet,
      action: onExcel,
    },
    {
      title: 'انتخاب از بانک سؤال',
      description: 'از سؤال‌های قبلی خودتان استفاده کنید؛ اختیاری است.',
      icon: BookOpen,
      action: onBank,
    },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3" aria-label="روش افزودن سؤال">
      {sources.map(({ title, description, icon: Icon, action }, index) => (
        <button
          key={title}
          type="button"
          onClick={action}
          disabled={disabled}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 ${index === 0 ? 'border-brand-500 bg-brand-600 text-white hover:bg-brand-700' : 'border-gray-200 bg-white text-gray-800 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'}`}
        >
          <Icon size={22} className="mt-1 shrink-0" />
          <span>
            <span className="block font-bold">{title}</span>
            <span className="mt-1 block text-xs leading-6 opacity-80">
              {description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
