import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';
import Logo from '../Logo/Logo';
import { useExamGuard } from '../../context/ExamGuardContext';
import { getCurrentUser, logout } from '../../api/authApi';
import { navigationItems, roleLabel } from './navigationItems';

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
  const { guardNavigation } = useExamGuard();
  const user = getCurrentUser();

  const visibleItems = navigationItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

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
    guardNavigation(() => {
      logout();
      navigate('/login');
    });
  }

  const initial =
    (user?.name?.trim() || user?.username?.trim())?.[0]?.toUpperCase() ?? '؟';

  return (
    <>
      {/* پس‌زمینه‌ی تیره‌ی موبایل، فقط وقتی سایدبار بازه */}
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
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-s border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 md:relative md:z-auto md:translate-x-0 md:border-e md:border-s-0 md:shadow-none ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* دکمه‌ی گرد جمع/باز کردن سایدبار — فقط دسکتاپ */}
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

        {/* اسکرول فقط همینجا محدود می‌شه، نه کل سایدبار */}
        <div className="flex h-full flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5 dark:border-gray-800">
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

            <nav className="flex flex-col gap-1.5 p-3">
              {visibleItems.map(({ label, to, icon: Icon }, index) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <NavLink
                    to={to}
                    onClick={(e) => handleNavClick(e, to)}
                    title={isCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-white'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                      } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* layoutId باعث می‌شه این نوارِ فعال، به‌جای این‌که هر
                            بار یهو محو/ظاهر بشه، از آیتمِ قبلی به این یکی
                            «بلغزه» - همون افکتِ معروفِ framer-motion */}
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active-indicator"
                            transition={{
                              type: 'spring',
                              stiffness: 380,
                              damping: 30,
                            }}
                            className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-600"
                          />
                        )}
                        <Icon
                          size={18}
                          className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                        />
                        <span className={isCollapsed ? 'md:hidden' : ''}>
                          {label}
                        </span>
                      </>
                    )}
                  </NavLink>
                </motion.div>
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-600/30">
                {initial}
              </div>
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
              onClick={handleLogout}
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