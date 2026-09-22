import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { collapseFade } from '../../../components/motion/variants';
import useTheme from '../../../hooks/useTheme';
import Logo from '../../../components/Logo/Logo';

const NAV_LINKS = [
  { label: 'ویژگی‌ها', href: '#features' },
  { label: 'اخبار', href: '#news' },
  { label: 'درباره ما', href: '#about' },
  { label: 'تعرفه‌ها', href: '#pricing' },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // این لینک‌ها section هایی تو خودِ صفحه‌ی فرود ("/") ان. اگه از یه
  // صفحه‌ی دیگه (مثلاً /blog) کلیک بشن، اول باید بریم "/" و بعد اسکرول
  // کنیم - یه <a href="#features"> ساده رو صفحه‌ی فعلی هیچ #features ای
  // نداره
  function handleNavLinkClick(event: React.MouseEvent, hash: string) {
    if (location.pathname === '/') return; // اسکرولِ خودکارِ مرورگر کافیه
    event.preventDefault();
    navigate('/', { state: { scrollTo: hash } });
  }

  function navLinkHref(hash: string): string {
    return location.pathname === '/' ? hash : `/${hash}`;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-surface-dark/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="صفحه‌ی اصلی"
          className="cursor-pointer"
        >
          <Logo />
        </button>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={navLinkHref(link.href)}
              onClick={(e) => handleNavLinkClick(e, link.href)}
              className="group relative text-sm font-medium text-gray-600 transition hover:text-brand-600 dark:text-gray-300 dark:hover:text-white"
            >
              {link.label}
              <span className="absolute -bottom-1.5 right-0 h-0.5 w-0 rounded-full bg-brand-600 transition-all duration-300 group-hover:w-full dark:bg-brand-400" />
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'حالت روشن' : 'حالت شب'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition duration-300 hover:rotate-45 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="group flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition duration-300 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-brand-600/50 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <LogIn
              size={15}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            ورود
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/40"
          >
            ثبت‌نام رایگان
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label={isMenuOpen ? 'بستن منو' : 'باز کردن منو'}
          aria-expanded={isMenuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 md:hidden"
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            variants={collapseFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden border-t border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-surface-dark md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={navLinkHref(link.href)}
                onClick={(e) => {
                  handleNavLinkClick(e, link.href);
                  setIsMenuOpen(false);
                }}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'حالت روشن' : 'حالت شب'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-brand-600/50 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <LogIn size={15} />
              ورود
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white"
            >
              ثبت‌نام رایگان
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
