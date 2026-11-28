import { useEffect, useState } from 'react';
import LogoutDialog from '../LogoutDialog/LogoutDialog';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  GraduationCap,
  LogOut,
  Newspaper,
  Settings,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Logo from '../Logo/Logo';
import { useExamGuard } from '../../context/ExamGuardContext';
import { logout } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar/Avatar';
import {
  groupNavigationItems,
  navigationGroupLabel,
  navigationItems,
  roleLabel,
  type NavigationGroupId,
} from './navigationItems';
import {
  ADMIN_NAVIGATION_STORAGE_PREFIX,
  ensureNavigationGroupExpanded,
  getNavigationGroupForPath,
  readExpandedNavigationGroups,
  toggleNavigationGroup,
  writeExpandedNavigationGroups,
} from './navigationState';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

type ExpandedGroupState = {
  storageKey: string;
  groups: NavigationGroupId[];
};

const navigationGroupIcons: Record<NavigationGroupId, LucideIcon> = {
  requests: ShieldCheck,
  education: GraduationCap,
  content: Newspaper,
  finance: Wallet,
  system: Settings,
};

function getNavigationStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { guardNavigation } = useExamGuard();
  const { user } = useAuth();

  const visibleItems = navigationItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  ).map(item => ({
    ...item,
    label: user?.role === 'SuperAdmin' ? item.adminLabel ?? item.label : item.label,
  }));

  const sections = groupNavigationItems(visibleItems);
  const expandedGroupsStorageKey =
    user?.role === 'SuperAdmin' && user.id
      ? ADMIN_NAVIGATION_STORAGE_PREFIX + user.id
      : '';
  const [expandedGroupState, setExpandedGroupState] = useState<ExpandedGroupState>(() => ({
    storageKey: expandedGroupsStorageKey,
    groups: readExpandedNavigationGroups(getNavigationStorage(), expandedGroupsStorageKey),
  }));
  const expandedGroups = expandedGroupState.storageKey === expandedGroupsStorageKey
    ? expandedGroupState.groups
    : readExpandedNavigationGroups(getNavigationStorage(), expandedGroupsStorageKey);
  const activeNavigationGroup = user?.role === 'SuperAdmin'
    ? getNavigationGroupForPath(sections, location.pathname)
    : undefined;

  useEffect(() => {
    if (expandedGroupState.storageKey === expandedGroupsStorageKey) return;

    setExpandedGroupState({
      storageKey: expandedGroupsStorageKey,
      groups: readExpandedNavigationGroups(getNavigationStorage(), expandedGroupsStorageKey),
    });
  }, [expandedGroupState.storageKey, expandedGroupsStorageKey]);

  useEffect(() => {
    if (!expandedGroupsStorageKey || expandedGroupState.storageKey !== expandedGroupsStorageKey) return;

    writeExpandedNavigationGroups(
      getNavigationStorage(),
      expandedGroupsStorageKey,
      expandedGroupState.groups
    );
  }, [expandedGroupState, expandedGroupsStorageKey]);

  useEffect(() => {
    if (!activeNavigationGroup || !expandedGroupsStorageKey) return;

    setExpandedGroupState((current) => {
      const currentGroups = current.storageKey === expandedGroupsStorageKey
        ? current.groups
        : readExpandedNavigationGroups(getNavigationStorage(), expandedGroupsStorageKey);
      if (currentGroups.includes(activeNavigationGroup)) return current;

      return {
        storageKey: expandedGroupsStorageKey,
        groups: ensureNavigationGroupExpanded(currentGroups, activeNavigationGroup),
      };
    });
  }, [activeNavigationGroup, expandedGroupsStorageKey, location.pathname]);

  function handleNavClick(event: React.MouseEvent, to: string) {
    event.preventDefault();
    onClose();
    guardNavigation(() => navigate(to));
  }

  function handleLogoClick() {
    onClose();
    guardNavigation(() => navigate('/dashboard'));
  }

  function handleLogout() {
    setConfirmLogout(false);
    guardNavigation(() => {
      logout();
      navigate('/login');
    });
  }

  function handleGroupToggle(group: NavigationGroupId) {
    if (!expandedGroupsStorageKey) return;

    setExpandedGroupState((current) => {
      const currentGroups = current.storageKey === expandedGroupsStorageKey
        ? current.groups
        : readExpandedNavigationGroups(getNavigationStorage(), expandedGroupsStorageKey);

      return {
        storageKey: expandedGroupsStorageKey,
        groups: toggleNavigationGroup(currentGroups, group),
      };
    });
  }

  function handleGroupButtonClick(group: NavigationGroupId) {
    if (isCollapsed) {
      onToggleCollapse();
      if (!expandedGroups.includes(group) && expandedGroupsStorageKey) {
        setExpandedGroupState((current) => {
          const currentGroups = current.storageKey === expandedGroupsStorageKey
            ? current.groups
            : readExpandedNavigationGroups(getNavigationStorage(), expandedGroupsStorageKey);

          return {
            storageKey: expandedGroupsStorageKey,
            groups: ensureNavigationGroupExpanded(currentGroups, group),
          };
        });
      }
      return;
    }

    handleGroupToggle(group);
  }

  function renderNavigationLink(
    item: (typeof visibleItems)[number],
    nested = false
  ) {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/workspace'}
        onClick={(event) => handleNavClick(event, item.to)}
        title={isCollapsed ? item.label : undefined}
        className={({ isActive }) => [
          'flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
          isActive
            ? 'sidebar-selected-glass text-brand-ink'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100',
          nested ? 'rounded-lg text-[13px]' : '',
          isCollapsed ? 'md:justify-center md:px-0' : '',
        ].filter(Boolean).join(' ')}
      >
        <Icon size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
        <span className={isCollapsed ? 'md:hidden' : ''}>
          {item.label}
        </span>
      </NavLink>
    );
  }

  return (
    <>
      <LogoutDialog open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={handleLogout} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex h-dvh w-72 min-h-0 flex-col border-s border-gray-100 bg-white shadow-2xl transition-all duration-300 dark:border-white/5 dark:bg-gray-900 md:relative md:z-auto md:translate-x-0 md:border-e md:border-s-0 md:shadow-none',
          isCollapsed ? 'md:w-20' : 'md:w-64',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          aria-label={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          className="absolute -left-5.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-md transition-all duration-200 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-brand-900 dark:hover:bg-brand-950/40 dark:hover:text-brand-ink md:flex"
        >
          {isCollapsed ? (
            <ChevronLeft size={14} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} className="-rotate-90" aria-hidden="true" />
          )}
        </button>

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-6">
              <button
                onClick={handleLogoClick}
                className="flex cursor-pointer items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
              >
                <Logo size="sm" showText={!isCollapsed} />
              </button>
              <button
                onClick={onClose}
                type="button"
                aria-label="بستن منو"
                className="rounded-md text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:text-gray-200 md:hidden"
              >
                <X size={20} />
              </button>
            </div>

            <nav dir="ltr" aria-label="منوی اصلی" className="sidebar-navigation panel-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-2">
              {sections.map((section, sectionIndex) => {
                if (!section.group) {
                  return (
                    <div key="main" dir="rtl" className="flex flex-col gap-1">
                      {section.items.map((item) => renderNavigationLink(item))}
                    </div>
                  );
                }

                const group = section.group;
                const GroupIcon = navigationGroupIcons[group];
                const isExpanded = expandedGroups.includes(group);
                const submenuId = 'sidebar-navigation-' + group;
                const groupLabel = navigationGroupLabel[group];

                return (
                  <div
                    key={group}
                    dir="rtl"
                    role="group"
                    aria-label={groupLabel}
                    className={[
                      'flex flex-col gap-1',
                      sectionIndex > 0 ? 'mt-2 border-t border-gray-100 pt-3 dark:border-white/5' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {group === 'requests' && !isCollapsed && (
                      <div className="mb-1 px-3 text-[10px] font-bold tracking-wide text-gray-400 dark:text-gray-500">
                        بخش‌های مدیریتی
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleGroupButtonClick(group)}
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded && !isCollapsed ? submenuId : undefined}
                      aria-label={isCollapsed ? 'باز کردن بخش ' + groupLabel : undefined}
                      title={isCollapsed ? groupLabel : undefined}
                      className={[
                        'flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-right text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                        isExpanded
                          ? 'border-violet-100 bg-violet-50/80 text-brand-ink dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-100'
                          : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-300 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white',
                        isCollapsed ? 'md:justify-center md:px-0' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <GroupIcon size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                        <span className={isCollapsed ? 'md:hidden' : 'truncate'}>
                          {groupLabel}
                        </span>
                      </span>
                      {!isCollapsed && (
                        <ChevronDown
                          size={15}
                          aria-hidden="true"
                          className={[
                            'shrink-0 text-gray-400 transition-transform duration-150 dark:text-gray-500',
                            isExpanded ? 'rotate-0' : 'rotate-90',
                          ].join(' ')}
                        />
                      )}
                    </button>

                    {!isCollapsed && (
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            id={submenuId}
                            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="mr-4 flex flex-col gap-1 border-r border-gray-200 py-1 pr-2 dark:border-gray-700">
                              {section.items.map((item) => renderNavigationLink(item, true))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div
            className={[
              'm-3 flex shrink-0 items-center rounded-xl border border-gray-100 bg-gray-50 p-3 transition-all duration-300 dark:border-white/5 dark:bg-gray-800/60',
              isCollapsed ? 'flex-col gap-2' : 'justify-between',
            ].join(' ')}
          >
            <div
              className={[
                'flex min-w-0 items-center gap-2.5',
                isCollapsed ? 'flex-col' : '',
              ].filter(Boolean).join(' ')}
            >
              <Avatar
                name={user?.name || user?.username}
                src={user?.avatarUrl}
                size={36}
              />
              <div className={isCollapsed ? 'hidden' : 'min-w-0'}>
                <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                  {user?.name || user?.username}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {user ? roleLabel[user.role] : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirmLogout(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition duration-200 hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:bg-danger-950/40 dark:hover:text-danger-400"
              title="خروج"
              aria-label="خروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
