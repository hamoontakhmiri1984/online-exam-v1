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
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon size={26} />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
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
