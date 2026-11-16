import type { ReactNode } from 'react';
import { Check, GraduationCap, Presentation } from 'lucide-react';

import Button from '../Button/Button';
import type { AccountRole } from './signup.types';

type Props = {
  role: AccountRole | null;
  onRoleChange: (role: AccountRole) => void;
  onNext: () => void;
  nextLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  children?: ReactNode;
};

const ROLE_OPTIONS: {
  value: AccountRole;
  icon: typeof GraduationCap;
  title: string;
  description: string;
}[] = [
  {
    value: 'Instructor',
    icon: Presentation,
    title: 'من مدرس هستم',
    description: 'کلاس و آزمون مدیریت می‌کنم',
  },
  {
    value: 'Student',
    icon: GraduationCap,
    title: 'من دانشجو هستم',
    description: 'شرکت در کلاس‌ها و آزمون‌ها',
  },
];

function RoleStep({
  role,
  onRoleChange,
  onNext,
  nextLabel = 'ادامه',
  loadingLabel = 'در حال ارسال کد تأیید…',
  loading = false,
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          چطور می‌خواهید استفاده کنید؟
        </label>

        <div className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map((option) => {
            const selected = role === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onRoleChange(option.value)}
                className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-5 text-center transition-colors ${
                  selected
                    ? 'border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/10 dark:bg-violet-500/15'
                    : 'border-gray-200 bg-white/70 hover:border-violet-300 dark:border-gray-600 dark:bg-white/5 dark:hover:border-violet-400'
                }`}
              >
                {selected && (
                  <span className="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}

                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-brand-ink"><Icon size={25} strokeWidth={1.8}/></span>

                <span className="text-sm font-bold text-gray-800 dark:text-white">
                  {option.title}
                </span>

                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        {role === 'Instructor' && (
          <p className="text-xs text-gray-400">
            در صورت فعال بودن بررسی مدرس، حساب پس از تأیید مدیر فعال می‌شود.
          </p>
        )}
      </div>

      {children}

      <Button type="button" onClick={onNext} disabled={loading}>
        {loading ? loadingLabel : nextLabel}
      </Button>
    </div>
  );
}

export default RoleStep;
