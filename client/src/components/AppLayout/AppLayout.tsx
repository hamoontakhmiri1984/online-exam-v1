import '../../glass-theme.css';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useTheme from '../../hooks/useTheme';
import useSidebarCollapse from '../../hooks/useSidebarCollapse';
import useWorkspaceBackground from '../../hooks/useWorkspaceBackground';
import { useAuth } from '../../context/AuthContext';
import { useExamGuard } from '../../context/ExamGuardContext';
import Sidebar from './SideBar';
import Header from './Header';

type AppLayoutProps = {
  children: ReactNode;
  title: string;
};

type PanelTab = { path: string; title: string };
export const TABS_KEY_PREFIX = 'exam-panel-tabs-account:';

function readTabs(key: string): PanelTab[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    if (!Array.isArray(saved)) return [];
    const valid = saved.filter((tab): tab is PanelTab =>
      typeof tab === 'object' && tab !== null &&
      typeof tab.path === 'string' && tab.path.startsWith('/') &&
      typeof tab.title === 'string'
    );
    const restored = Array.from(new Map(valid.map(tab => [tab.path.split('?')[0], { ...tab, path: tab.path.split('?')[0] }])).values());
    return restored.filter(tab => tab.path !== '/workspace').slice(-20);
  } catch {
    return [];
  }
}

function AppLayout({ children, title }: AppLayoutProps) {
  const { isDark, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapse } = useSidebarCollapse();
  const { user } = useAuth();
  const { selected: workspaceBackground } = useWorkspaceBackground(user?.id);
  const { guardNavigation } = useExamGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const showTabs = user?.role === 'Instructor' || user?.role === 'SuperAdmin';
  const accountKey = showTabs && user?.id ? `${TABS_KEY_PREFIX}${user.id}` : '';
  const [tabState, setTabState] = useState<{ accountKey: string; tabs: PanelTab[] }>(() => ({ accountKey: '', tabs: [] }));
  const tabs = !accountKey ? [] : tabState.accountKey === accountKey ? tabState.tabs : readTabs(accountKey);
  const currentPath = location.pathname;

  useEffect(() => {
    if (!accountKey || currentPath === '/workspace') return;
    setTabState(previous => {
      const existing = previous.accountKey === accountKey ? previous.tabs : readTabs(accountKey);
      const next = existing.some(tab => tab.path === currentPath)
        ? existing.map(tab => tab.path === currentPath ? { ...tab, title } : tab)
        : [...existing, { path: currentPath, title }];
      const updated = next.slice(-20);
      try {
        sessionStorage.setItem(accountKey, JSON.stringify(updated));
      } catch {
        // Browsers may block session storage; keep the dashboard usable.
      }
      return { accountKey, tabs: updated };
    });
  }, [accountKey, currentPath, title]);

  function selectPlainTableRow(event: React.MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('button,a,input,select,textarea,[role="button"]')) return;
    const row = target.closest('tbody tr');
    if (!(row instanceof HTMLTableRowElement) || row.hasAttribute('aria-selected')) return;
    const table = row.closest('table');
    if (!table) return;
    table.querySelectorAll('tbody tr[data-selected-row="true"]').forEach(previous => {
      previous.removeAttribute('data-selected-row');
    });
    row.setAttribute('data-selected-row', 'true');
  }

  function closeTab(path: string) {
    if (!accountKey) return;
    const index = tabs.findIndex(tab => tab.path === path);
    if (index < 0) return;
    const remaining = tabs.filter(tab => tab.path !== path);
    try {
      sessionStorage.setItem(accountKey, JSON.stringify(remaining));
    } catch {
      // Closing a tab should still work when storage is unavailable.
    }
    setTabState({ accountKey, tabs: remaining });
    if (path === currentPath) {
      const next = remaining[Math.min(index, remaining.length - 1)];
      guardNavigation(() => navigate(next?.path ?? '/workspace'));
    }
  }

  return (
    <div className={`glass-app-shell workspace-theme-${workspaceBackground} min-h-screen bg-surface-light text-gray-900 transition-colors dark:bg-surface-dark dark:text-white`}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main onClickCapture={selectPlainTableRow} className={`min-w-0 flex-1 transition-all duration-300 motion-reduce:transition-none ${isCollapsed ? 'md:w-[calc(100%-5rem)]' : 'md:w-[calc(100%-16rem)]'}`}>
          <Header
            title={title}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
          {showTabs && tabs.length > 0 && (
            <nav aria-label="تب‌های باز پنل" className="panel-internal-tabs">
              {tabs.map(tab => (
                <div key={tab.path} onMouseDown={(event) => { if (event.button === 1) { event.preventDefault(); closeTab(tab.path); } }} className={`panel-internal-tab ${tab.path === currentPath ? 'is-active' : ''}`}>
                  <button type="button" className="panel-internal-tab-label" onClick={() => guardNavigation(() => navigate(tab.path))} aria-current={tab.path === currentPath ? 'page' : undefined} title={tab.title}>
                    {tab.title}
                  </button>
                  <button type="button" className="panel-internal-tab-close" onClick={() => closeTab(tab.path)} aria-label={`بستن تب ${tab.title}`} title="بستن تب">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </nav>
          )}
          <div className="mx-auto w-full max-w-none px-3 py-5 sm:px-4 md:px-5 md:py-7 xl:px-6 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
