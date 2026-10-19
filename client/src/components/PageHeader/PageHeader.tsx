import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  /** دکمه‌ها یا کنترل‌های سمت چپ عنوان (مثلاً «افزودن») */
  actions?: ReactNode;
};

// عنوان استاندارد همه‌ی صفحه‌های پنل: یک تیتر، یک توضیح کوتاه، و حداکثر
// یک گروه کنترل. فاصله‌ی ۳۲ پیکسل تا محتوای صفحه
export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
