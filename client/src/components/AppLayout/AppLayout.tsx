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
    <div className="min-h-screen bg-surface-light text-gray-900 transition-colors dark:bg-surface-dark dark:text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        <main
          className={`min-w-0 flex-1 transition-all duration-300 motion-reduce:transition-none ${
            isCollapsed ? 'md:w-[calc(100%-5rem)]' : 'md:w-[calc(100%-16rem)]'
          }`}
        >
          <Header
            title={title}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />

          <div className="mx-auto w-full max-w-[84rem] px-4 py-6 md:px-10 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;