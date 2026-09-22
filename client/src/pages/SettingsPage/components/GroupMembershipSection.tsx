import { Users, LogIn } from 'lucide-react';
import type { Group } from '../../../api/groupApi';

function GroupMembershipSection({
  myGroups,
  groupsLoading,
  joinCode,
  onJoinCodeChange,
  joining,
  onSubmit,
}: {
  myGroups: Group[];
  groupsLoading: boolean;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  joining: boolean;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <Users size={18} />
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-white">
          گروه‌های من
        </h2>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {groupsLoading ? (
          <p className="text-xs text-gray-400">در حال بارگذاری...</p>
        ) : myGroups.length > 0 ? (
          myGroups.map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-400"
            >
              <Users size={12} />
              {g.name}
            </span>
          ))
        ) : (
          <p className="text-xs text-gray-400">هنوز عضو هیچ گروهی نیستی</p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            پیوستن با کد عضویت
          </label>
          <input
            value={joinCode}
            onChange={(e) => onJoinCodeChange(e.target.value)}
            placeholder="مثلاً MATH01"
            className="mt-1 w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
          />
        </div>
        <button
          type="submit"
          disabled={joining}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          <LogIn size={15} />
          {joining ? 'در حال بررسی...' : 'پیوستن'}
        </button>
      </form>
    </div>
  );
}

export default GroupMembershipSection;