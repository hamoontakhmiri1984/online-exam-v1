import { useState } from 'react';
import usePagedList from '../../hooks/usePagedList';
import { getAdminInstructors } from '../../api/adminInstructorApi';
import { userDisplayName } from '../../lib/userDisplayName';
import { controlClass, LoadError } from './FilterBar';
export default function InstructorFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('انتخاب مدرس');
  const list = usePagedList((q) => getAdminInstructors(q), '', open);
  return (
    <div className="relative">
      <button
        type="button"
        className={controlClass}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {value ? label : 'انتخاب مدرس'}
      </button>
      {open && (
        <section
          className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          aria-label="انتخاب مدرس"
        >
          <input
            autoFocus
            type="search"
            value={list.q}
            onChange={(e) => list.setSearch(e.target.value)}
            placeholder="جستجوی مدرس"
            aria-label="جستجوی مدرس"
            maxLength={100}
            className={`${controlClass} w-full`}
          />
          <LoadError message={list.error} retry={list.reload} />
          <ul className="my-2 max-h-64 overflow-auto">
            {list.items.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => {
                    setLabel(userDisplayName(i));
                    onChange(i.id);
                    setOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {userDisplayName(i)}
                </button>
              </li>
            ))}
          </ul>
          {list.loading && (
            <p role="status" className="p-3 text-sm text-gray-500">
              در حال دریافت…
            </p>
          )}
          {!list.loading && !list.items.length && (
            <p className="p-3 text-sm text-gray-500">مدرسی پیدا نشد.</p>
          )}
          <div className="flex justify-between text-sm dark:text-gray-300">
            <button
              type="button"
              disabled={list.loading || list.page <= 1}
              onClick={() => list.setPage(list.page - 1)}
              className="p-2 disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2"
            >
              بستن
            </button>
            <button
              type="button"
              disabled={list.loading || list.page * list.pageSize >= list.total}
              onClick={() => list.setPage(list.page + 1)}
              className="p-2 disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
