import { useId } from 'react';
import { FileSpreadsheet } from 'lucide-react';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  description?: string;
};

export default function ExcelImportButton({ onClick, disabled, description }: Props) {
  const descriptionId = useId();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="ورود از اکسل"
      aria-describedby={description ? descriptionId : undefined}
      className={`inline-flex min-h-11 gap-2.5 rounded-xl border border-violet-200 bg-white text-start text-sm font-semibold text-brand-ink transition-colors hover:border-violet-400 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/30 dark:bg-slate-900 dark:hover:border-violet-400 dark:hover:bg-violet-500/10 ${description ? 'items-start p-4' : 'items-center px-4 py-2'}`}
    >
      <FileSpreadsheet size={18} aria-hidden="true" className={`shrink-0 ${description ? 'mt-0.5' : ''}`} />
      <span>
        ورود از اکسل
        {description && (
          <span id={descriptionId} className="mt-1 block text-xs font-normal leading-6 text-gray-600 dark:text-gray-300">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
