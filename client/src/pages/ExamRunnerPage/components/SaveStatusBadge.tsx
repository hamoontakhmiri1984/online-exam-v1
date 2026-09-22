import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { AutosaveStatus } from '../../../hooks/useExamRunner/useExamAutosave';

interface SaveStatusBadgeProps {
  status: AutosaveStatus;
  onRetry: () => void;
}

function SaveStatusBadge({ status, onRetry }: SaveStatusBadgeProps) {
  if (status === 'idle') return null;

  if (status === 'error') {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-xl bg-danger-50 px-3 py-2 text-xs font-medium text-danger-600 dark:bg-danger-950/40 dark:text-danger-400"
      >
        <AlertTriangle size={14} />
        پاسخ‌ها ذخیره نشد
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-danger-600 px-2 py-1 text-white transition hover:bg-danger-700"
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-500">
        <CheckCircle2 size={14} />
        ذخیره شد
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <Loader2
        size={14}
        className={status === 'saving' ? 'animate-spin' : 'opacity-40'}
      />
      {status === 'saving' ? 'در حال ذخیره…' : 'تغییرات ذخیره‌نشده'}
    </span>
  );
}

export default SaveStatusBadge;
