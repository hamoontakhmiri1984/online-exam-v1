import { useState } from 'react';
import LogoutDialog from '../LogoutDialog/LogoutDialog';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';
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
} from './navigationItems';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
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
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-s border-gray-100 bg-white shadow-2xl transition-all duration-300 dark:border-white/5 dark:bg-gray-900 md:relative md:z-auto md:translate-x-0 md:border-e md:border-s-0 md:shadow-none ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          className="absolute -left-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-md transition-all duration-200 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-brand-900 dark:hover:bg-brand-950/40 dark:hover:text-brand-400 md:flex"
        >
          {isCollapsed ? (
            <ChevronLeft size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>

        <div className="flex h-full flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between px-5 pb-3 pt-6">
              <button
                onClick={handleLogoClick}
                className="flex cursor-pointer items-center"
              >
                <Logo size="sm" showText={!isCollapsed} />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 md:hidden"
              >
                <X size={20} />
              </button>
            </div>

            <nav aria-label="منوی اصلی" className="flex flex-col gap-6 px-3 py-4">
              {sections.map((section, sectionIndex) => (
                <div
                  key={section.group ?? 'main'}
                  role={section.group ? 'group' : undefined}
                  aria-label={
                    section.group ? navigationGroupLabel[section.group] : undefined
                  }
                  className="flex flex-col gap-0.5"
                >
                  {section.group && !isCollapsed && (
                    <p className="px-3 pb-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      {navigationGroupLabel[section.group]}
                    </p>
                  )}
                  {section.group && isCollapsed && sectionIndex > 0 && (
                    <div
                      aria-hidden="true"
                      className="mx-3 mb-2 h-px bg-gray-100 dark:bg-white/5"
                    />
                  )}
                  {section.items.map(({ label, to, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={(e) => handleNavClick(e, to)}
                      title={isCollapsed ? label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-500 ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100'
                        } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`
                      }
                    >
                      <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                      <span className={isCollapsed ? 'md:hidden' : ''}>
                        {label}
                      </span>
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </div>

          <div
            className={`m-3 flex items-center rounded-xl bg-gray-50 p-3 transition-all duration-300 dark:bg-gray-800/60 ${
              isCollapsed ? 'flex-col gap-2' : 'justify-between'
            }`}
          >
            <div
              className={`flex min-w-0 items-center gap-2.5 ${
                isCollapsed ? 'flex-col' : ''
              }`}
            >
              <Avatar
                name={user?.name || user?.username}
                src={user?.avatarUrl}
                size={36}
              />
              <div className={`min-w-0 ${isCollapsed ? 'hidden' : ''}`}>
                <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                  {user?.name || user?.username}
                </p>
                <p className="text-xs text-gray-400">
                  {user ? roleLabel[user.role] : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirmLogout(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition duration-200 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-950/40 dark:hover:text-danger-400"
              title="خروج"
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
