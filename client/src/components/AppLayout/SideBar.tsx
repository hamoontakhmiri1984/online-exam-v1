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
  sortRoleNavigationItems,
  type NavigationGroupId,
} from './navigationItems';
import {
  ensureNavigationGroupExpanded,
  getNavigationGroupForPath,
  toggleNavigationGroup,
} from './navigationState';
import './admin-sidebar.css';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

const navigationGroupIcons: Record<NavigationGroupId, LucideIcon> = {
  requests: ShieldCheck,
  education: GraduationCap,
  content: Newspaper,
  finance: Wallet,
  system: Settings,
};

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
  const isAdmin = user?.role === 'SuperAdmin';

  const visibleItems = navigationItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  ).map(item => ({
    ...item,
    label: user?.role === 'SuperAdmin' ? item.adminLabel ?? item.label : item.label,
  }));
  const orderedVisibleItems = user && user.role !== 'SuperAdmin'
    ? sortRoleNavigationItems(visibleItems, user.role)
    : visibleItems;
  const roleIdentityCaption = user?.role === 'Instructor'
    ? 'مدیریت تدریس و کلاس‌ها'
    : user?.role === 'Student'
      ? 'فضای یادگیری و پیگیری پیشرفت'
      : 'مدیریت و راهبری سامانه';

  const sections = groupNavigationItems(orderedVisibleItems);
  const expandedGroupsAccountKey = isAdmin ? user?.id ?? '' : '';
  const [expandedGroupState, setExpandedGroupState] = useState<{
    accountKey: string;
    groups: NavigationGroupId[];
  }>({ accountKey: expandedGroupsAccountKey, groups: [] });
  const expandedGroups = expandedGroupState.accountKey === expandedGroupsAccountKey
    ? expandedGroupState.groups
    : [];
  const activeNavigationGroup = isAdmin
    ? getNavigationGroupForPath(sections, location.pathname)
    : undefined;

  // Expanded groups are deliberately session-only: every fresh login starts collapsed.
  useEffect(() => {
    if (expandedGroupState.accountKey === expandedGroupsAccountKey) return;
    setExpandedGroupState({ accountKey: expandedGroupsAccountKey, groups: [] });
  }, [expandedGroupState.accountKey, expandedGroupsAccountKey]);

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
    setExpandedGroupState((current) => {
      const currentGroups = current.accountKey === expandedGroupsAccountKey
        ? current.groups
        : [];
      return {
        accountKey: expandedGroupsAccountKey,
        groups: toggleNavigationGroup(currentGroups, group),
      };
    });
  }

  function handleGroupButtonClick(group: NavigationGroupId) {
    if (isCollapsed) {
      onToggleCollapse();
      setExpandedGroupState((current) => {
        const currentGroups = current.accountKey === expandedGroupsAccountKey
          ? current.groups
          : [];
        return {
          accountKey: expandedGroupsAccountKey,
          groups: ensureNavigationGroupExpanded(currentGroups, group),
        };
      });
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
          isAdmin ? 'admin-nav-link' : 'role-nav-link',
          isActive
            ? (isAdmin ? 'admin-nav-link--active text-brand-ink' : 'role-nav-link--active')
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100',
          nested ? 'rounded-lg text-[13px] admin-nav-link--nested' : '',
          !nested && isAdmin ? 'admin-nav-link--primary' : '',
          isCollapsed ? 'md:justify-center md:px-0' : '',
        ].filter(Boolean).join(' ')}
      >
        {isAdmin ? (
          <span className="admin-nav-link-icon">
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
        ) : (
          <span className="role-nav-link-icon">
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
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
          'admin-sidebar fixed inset-y-0 right-0 z-50 flex h-dvh w-72 min-h-0 flex-col border-s border-gray-100 bg-white shadow-2xl transition-all duration-300 dark:border-white/5 dark:bg-gray-900 md:relative md:z-auto md:translate-x-0 md:border-e md:border-s-0 md:shadow-none',
          isCollapsed ? 'md:w-20' : 'md:w-64',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          isAdmin ? 'admin-sidebar--executive' : 'role-sidebar--executive',
        ].filter(Boolean).join(' ')}
      >
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          aria-label={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          className="admin-sidebar-collapse absolute -left-5.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-md transition-all duration-200 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-brand-900 dark:hover:bg-brand-950/40 dark:hover:text-brand-ink md:flex"
        >
          {isCollapsed ? (
            <ChevronLeft size={14} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} className="-rotate-90" aria-hidden="true" />
          )}
        </button>

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="admin-sidebar-brand-row flex shrink-0 items-center justify-between px-5 pb-3 pt-6">
              <button
                onClick={handleLogoClick}
                aria-label="رفتن به میز کار"
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

            {isAdmin && (
              <div className={['admin-sidebar-identity mx-3 mb-3', isCollapsed ? 'md:hidden' : ''].join(' ')}>
                <div className="admin-sidebar-identity-main">
                  <div className="admin-sidebar-avatar">
                    <Avatar
                      name={user?.name || user?.username}
                      src={user?.avatarUrl}
                      size={42}
                      className="admin-sidebar-avatar-image"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="admin-sidebar-identity-name truncate">
                      {user?.name || user?.username || 'کاربر ارشد'}
                    </p>
                    <p className="admin-sidebar-identity-role">
                      مدیر سامانه
                    </p>
                  </div>
                  <span className="admin-sidebar-identity-mark" aria-hidden="true" />
                </div>
                <span className="admin-sidebar-identity-caption">مدیریت و راهبری سامانه</span>
              </div>
            )}

            {!isAdmin && user && (
              <div className={['role-sidebar-identity mx-3 mb-3', isCollapsed ? 'md:hidden' : ''].join(' ')}>
                <div className="role-sidebar-identity-main">
                  <div className="role-sidebar-avatar">
                    <Avatar
                      name={user.name || user.username}
                      src={user.avatarUrl}
                      size={42}
                      className="role-sidebar-avatar-image"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="role-sidebar-identity-name truncate">
                      {user.name || user.username}
                    </p>
                    <p className="role-sidebar-identity-role">
                      {roleLabel[user.role]}
                    </p>
                  </div>
                  <span className="role-sidebar-identity-mark" aria-hidden="true" />
                </div>
                <span className="role-sidebar-identity-caption">{roleIdentityCaption}</span>
              </div>
            )}

            <nav dir="ltr" aria-label="منوی اصلی" className="sidebar-navigation panel-scrollbar admin-sidebar-navigation flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-2">
              {sections.map((section, sectionIndex) => {
                if (!section.group) {
                  return (
                    <div
                      key="main"
                      dir="rtl"
                      className={[
                        'flex flex-col gap-1',
                        isAdmin ? 'admin-nav-primary' : 'role-nav-primary',
                      ].join(' ')}
                    >
                      {section.items.map((item) => renderNavigationLink(item))}
                    </div>
                  );
                }

                const group = section.group;
                const GroupIcon = navigationGroupIcons[group];
                const isExpanded = expandedGroups.includes(group);
                const submenuId = 'sidebar-navigation-' + group;
                const groupLabel = navigationGroupLabel[group];
                const hasActiveRoute = activeNavigationGroup === group;

                return (
                  <div
                    key={group}
                    dir="rtl"
                    role="group"
                    aria-label={groupLabel}
                    className={[
                      'flex flex-col gap-1',
                      isAdmin ? 'admin-nav-group' : '',
                      isExpanded ? 'is-expanded' : '',
                      hasActiveRoute ? 'has-active-route' : '',
                      sectionIndex > 0 ? 'mt-2 border-t border-gray-100 pt-3 dark:border-white/5' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {group === 'requests' && !isCollapsed && (
                      <div className="admin-nav-section-heading">
                        <span>مدیریت و راهبری</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleGroupButtonClick(group)}
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded && !isCollapsed ? submenuId : undefined}
                      aria-label={groupLabel}
                      title={isCollapsed ? groupLabel : undefined}
                      className={[
                        'admin-nav-group-trigger flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-right text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                        isExpanded ? 'is-expanded' : '',
                        hasActiveRoute ? 'has-active-route' : '',
                        isCollapsed ? 'md:justify-center md:px-0' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <span className="admin-nav-group-leading flex min-w-0 items-center gap-3">
                        <span className="admin-nav-group-icon">
                          <GroupIcon size={18} strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className={isCollapsed ? 'md:hidden' : 'truncate'}>
                          {groupLabel}
                        </span>
                      </span>
                      {!isCollapsed && (
                        <span className="admin-nav-group-trailing">
                          <ChevronDown
                            size={15}
                            aria-hidden="true"
                            className={[
                              'admin-nav-group-chevron shrink-0 transition-transform duration-150',
                              isExpanded ? 'rotate-0' : 'rotate-90',
                            ].join(' ')}
                          />
                        </span>
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
                            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                            className="admin-nav-submenu-wrap overflow-hidden"
                          >
                            <div className="admin-nav-submenu mr-2 flex flex-col gap-1 py-2 pr-2">
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

          {isAdmin ? (
            <div className={['admin-sidebar-footer m-3 flex shrink-0 items-center gap-2', isCollapsed ? 'md:flex-col md:justify-center' : ''].join(' ')}>
              {isCollapsed && (
                <Avatar
                  name={user?.name || user?.username}
                  src={user?.avatarUrl}
                  size={34}
                  className="admin-sidebar-compact-avatar"
                />
              )}
              <button
                onClick={() => setConfirmLogout(true)}
                dir="rtl"
                className={['admin-sidebar-logout flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500', isCollapsed ? 'md:h-9 md:w-9 md:flex-none md:px-0' : ''].join(' ')}
                title="خروج از سامانه"
                aria-label="خروج از سامانه"
              >
                <span className={`sidebar-logout-icon ${isCollapsed ? 'md:border-l-0 md:pl-0' : ''}`}>
                  <LogOut size={17} aria-hidden="true" />
                </span>
                <span aria-hidden="true" className={`sidebar-logout-divider ${isCollapsed ? 'md:hidden' : ''}`} />
                <span className={isCollapsed ? 'md:hidden' : ''}>خروج از سامانه</span>
              </button>
            </div>
          ) : (
            <div className={['role-sidebar-footer m-3 flex shrink-0 items-center rounded-xl gap-2', isCollapsed ? 'md:flex-col md:justify-center' : ''].join(' ')}>
              {isCollapsed && (
                <Avatar
                  name={user?.name || user?.username}
                  src={user?.avatarUrl}
                  size={34}
                  className="role-sidebar-compact-avatar"
                />
              )}
              <button
                onClick={() => setConfirmLogout(true)}
                dir="rtl"
                className={['role-sidebar-logout flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500', isCollapsed ? 'md:h-9 md:w-9 md:flex-none md:px-0' : ''].join(' ')}
                title="خروج از سامانه"
                aria-label="خروج از سامانه"
              >
                <span className={`sidebar-logout-icon ${isCollapsed ? 'md:border-l-0 md:pl-0' : ''}`}>
                  <LogOut size={17} aria-hidden="true" />
                </span>
                <span aria-hidden="true" className={`sidebar-logout-divider ${isCollapsed ? 'md:hidden' : ''}`} />
                <span className={isCollapsed ? 'md:hidden' : ''}>خروج از سامانه</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
