import type { FormEvent } from 'react';

import Button from '../Button/Button';
import type { AccountRole } from './signup.types';

type Props = {
  role: AccountRole;
  name: string;
  identifier: string;
  loading: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function ReviewStep({
  role,
  name,
  identifier,
  loading,
  onBack,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
    >
      <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
        <div className="flex flex-col gap-1">
          <p>
            <span className="text-gray-400 dark:text-gray-500">
              نوع حساب:{' '}
            </span>

            {role === 'Student'
              ? 'دانشجو'
              : 'مدرس'}
          </p>

          <p>
            <span className="text-gray-400 dark:text-gray-500">
              نام:{' '}
            </span>

            {name}
          </p>

          <p>
            <span className="text-gray-400 dark:text-gray-500">
              شناسه:{' '}
            </span>

            {identifier}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          قبلی
        </button>

        <div className="flex-2">
          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'در حال ارسال کد تایید...'
              : 'ثبت‌نام و ارسال کد'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default ReviewStep;