import { House } from 'lucide-react';

type SiteHomeButtonProps = {
  onClick: () => void;
};

export default function SiteHomeButton({ onClick }: SiteHomeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="صفحه اصلی سایت"
      title="رفتن به صفحه اصلی سایت"
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200/70 bg-violet-50/70 px-2.5 text-xs font-semibold text-violet-700 transition-colors duration-200 hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200 dark:hover:border-violet-400/40 dark:hover:bg-violet-400/20 sm:px-3"
    >
      <House size={16} aria-hidden="true" />
      <span className="hidden sm:inline">صفحه اصلی سایت</span>
    </button>
  );
}
