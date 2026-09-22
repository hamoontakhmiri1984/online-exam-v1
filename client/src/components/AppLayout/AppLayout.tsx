import { useState, type ReactNode } from 'react';
import useTheme from '../../hooks/useTheme';
import useSidebarCollapse from '../../hooks/useSidebarCollapse';
import Sidebar from './SideBar';
import Header from './Header';

type AppLayoutProps = {
  children: ReactNode;
  title: string;
};

function AppLayout({ children, title }: AppLayoutProps) {
  const { isDark, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapse } = useSidebarCollapse();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        <main
          className={`flex-1 transition-all duration-300 ${
            isCollapsed ? 'md:w-[calc(100%-5rem)]' : 'md:w-[calc(100%-16rem)]'
          }`}
        >
          <Header
            title={title}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />

          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;