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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200/60 bg-white/80 px-4 py-3.5 backdrop-blur-md dark:border-white/5 dark:bg-gray-900/80 md:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="باز کردن منو"
          onClick={onOpenSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 md:hidden"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={isDark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک'}
          aria-pressed={isDark}
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
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