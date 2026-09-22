import { Check } from 'lucide-react';

import Button from '../Button/Button';
import type { AccountRole } from './signup.types';

type Props = {
  role: AccountRole | null;
  onRoleChange: (role: AccountRole) => void;
  onNext: () => void;
};

const ROLE_OPTIONS: {
  value: AccountRole;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    value: 'Instructor',
    icon: '👨‍🏫',
    title: 'من مدرس هستم',
    description: 'کلاس و آزمون مدیریت می‌کنم',
  },
  {
    value: 'Student',
    icon: '🎓',
    title: 'من دانشجو هستم',
    description: 'شرکت در کلاس‌ها و آزمون‌ها',
  },
];

function RoleStep({ role, onRoleChange, onNext }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          چطور می‌خواهید استفاده کنید؟
        </label>

        <div className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map((option) => {
            const selected = role === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRoleChange(option.value)}
                className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition ${
                  selected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                }`}
              >
                {selected && (
                  <span className="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}

                <span className="text-2xl">{option.icon}</span>

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
            حساب مدرس بعد از ثبت‌نام باید توسط مدیر سیستم تأیید شود.
          </p>
        )}
      </div>

      <Button type="button" onClick={onNext}>
        بعدی
      </Button>
    </div>
  );
}

export default RoleStep;
