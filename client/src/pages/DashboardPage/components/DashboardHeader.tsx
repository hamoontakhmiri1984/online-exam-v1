import { Calendar, Sparkles } from 'lucide-react';
import type { User } from '../../../api/authApi';
import { getTodayJalali } from '../Dashboard.utils';

type DashboardHeaderProps = {
  user: User | null;
};

function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          <Calendar size={13} />
          {getTodayJalali()}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl bg-linear-to-l from-brand-600 to-brand-700 px-6 py-4 text-white shadow-md shadow-brand-600/20 dark:shadow-none">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-white/80">
            <Sparkles size={14} />
            خوش آمدی
          </p>
          <h1 className="text-lg font-bold mt-0.5">
            {user?.name || user?.username || 'کاربر'}
          </h1>
        </div>
        <p className="hidden sm:block text-sm text-white/80">
          امروز وضعیت آزمون‌هایت رو اینجا می‌بینی
        </p>
      </div>
    </>
  );
}

export default DashboardHeader;