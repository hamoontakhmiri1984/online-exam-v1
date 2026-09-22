import { Menu, Sun, Moon } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';

type HeaderProps = {
  title: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
};

function Header({
  title,
  isDark,
  onToggleTheme,
  onOpenSidebar,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="باز کردن منو"
          onClick={onOpenSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isDark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک'}
          aria-pressed={isDark}
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition duration-300 hover:rotate-45 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {isDark ? (
            <Sun size={16} aria-hidden="true" />
          ) : (
            <Moon size={16} aria-hidden="true" />
          )}
        </button>

        <NotificationsPanel />
      </div>
    </header>
  );
}

export default Header;