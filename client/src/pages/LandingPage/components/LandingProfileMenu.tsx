import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import Avatar from '../../../components/Avatar/Avatar';
import LogoutDialog from '../../../components/LogoutDialog/LogoutDialog';
import useOnClickOutside from '../../../hooks/useOnClickOutside';
import type { LandingAccountView } from './landingAccountView';

type VerifiedAccount = Extract<LandingAccountView, { status: 'authenticated' }>;

type Props = {
  account: VerifiedAccount;
  onNavigate: (path: string) => void;
  onLogout: () => void;
};

export default function LandingProfileMenu({ account, onNavigate, onLogout }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(wrapperRef, () => setIsOpen(false), isOpen);

  function navigateTo(path: string) {
    setIsOpen(false);
    onNavigate(path);
  }

  function logout() {
    setIsOpen(false);
    setConfirmLogout(false);
    onLogout();
  }

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative shrink-0"
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
      >
        <button
          type="button"
          aria-label={`منوی حساب کاربری ${account.displayName}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={() => setIsOpen((previous) => !previous)}
          className="group inline-flex h-11 max-w-54 items-center gap-2 rounded-2xl border border-violet-200/70 bg-white/75 px-2.5 shadow-sm shadow-violet-500/5 backdrop-blur-xl transition-all duration-300 hover:border-violet-300 hover:bg-violet-50/80 hover:shadow-md hover:shadow-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-violet-400/25 dark:bg-slate-900/70 dark:hover:border-violet-300/40 dark:hover:bg-violet-500/10 sm:px-3"
        >
          <Avatar name={account.displayName} src={account.user.avatarUrl} size={32} />
          <span className="hidden min-w-0 text-right sm:block">
            <span className="block truncate text-xs font-bold text-slate-900 dark:text-white">{account.displayName}</span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400">{account.roleName}</span>
          </span>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`text-violet-500 transition-transform duration-300 dark:text-violet-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -7, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -7, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              aria-label="گزینه‌های حساب کاربری"
              className="absolute left-0 top-full z-[60] mt-3 w-64 max-w-[calc(100vw-1.5rem)] origin-top-left overflow-hidden rounded-2xl border border-violet-200/70 bg-white/95 p-2 shadow-xl shadow-violet-950/10 backdrop-blur-2xl dark:border-violet-400/20 dark:bg-slate-900/95"
            >
              <div className="mb-1 flex items-center gap-3 rounded-xl bg-violet-50/70 px-3 py-3 dark:bg-violet-400/10">
                <Avatar name={account.displayName} src={account.user.avatarUrl} size={39} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{account.displayName}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">حساب {account.roleName}</p>
                </div>
              </div>
              <div className="my-2 h-px bg-violet-100 dark:bg-white/10" />
              <button
                type="button"
                onClick={() => navigateTo(account.dashboardPath)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-medium text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-200 dark:hover:bg-violet-400/10 dark:hover:text-white"
              >
                <LayoutDashboard size={17} className="text-violet-500" aria-hidden="true" />
                ورود به میزکار
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/settings')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-medium text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-200 dark:hover:bg-violet-400/10 dark:hover:text-white"
              >
                <Settings size={17} className="text-violet-500" aria-hidden="true" />
                تنظیمات حساب
              </button>
              <div className="my-2 h-px bg-violet-100 dark:bg-white/10" />
              <button
                type="button"
                onClick={() => { setIsOpen(false); setConfirmLogout(true); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                <LogOut size={17} aria-hidden="true" />
                خروج از حساب
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LogoutDialog
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={logout}
      />
    </>
  );
}
