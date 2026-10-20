import type { ElementType, ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  as?: ElementType;
  padded?: boolean;
  className?: string;
};

export const cardSurfaceClass =
  'rounded-2xl bg-white shadow-soft ring-1 ring-gray-950/5 dark:bg-gray-900 dark:shadow-none dark:ring-white/10';

export default function Card({
  children,
  as: Tag = 'div',
  padded = true,
  className = '',
}: CardProps) {
  return (
    <Tag
      className={`${cardSurfaceClass} ${padded ? 'p-6' : ''} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
