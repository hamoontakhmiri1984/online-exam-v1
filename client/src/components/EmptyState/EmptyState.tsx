import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-dashed border-violet-200/70 bg-gradient-to-b from-violet-50/70 to-white/40 px-6 py-14 text-center dark:border-violet-400/20 dark:from-violet-500/10 dark:to-transparent">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink dark:bg-brand-500/15">
        <Icon size={26} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-lg active:scale-[0.98] dark:shadow-none"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
