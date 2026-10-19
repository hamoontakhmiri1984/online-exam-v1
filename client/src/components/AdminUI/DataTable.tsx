import type { ReactNode } from 'react';
export type Column<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
};
export default function DataTable<T extends { id: string }>({
  items,
  columns,
  loading = false,
  empty = 'موردی با این شرایط پیدا نشد.',
}: {
  items: T[];
  columns: Column<T>[];
  loading?: boolean;
  empty?: string;
}) {
  return (
    <div
      className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      aria-busy={loading}
    >
      <table className="w-full text-right text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
          <tr>
            {columns.map((c) => (
              <th
                scope="col"
                key={c.key}
                className="whitespace-nowrap px-5 py-4 font-medium"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading && !items.length
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-5 py-5">
                      <div className="h-4 min-w-16 animate-pulse rounded bg-gray-100 motion-reduce:animate-none dark:bg-gray-800" />
                    </td>
                  ))}
                </tr>
              ))
            : items.map((item) => (
                <tr
                  key={item.id}
                  className="text-gray-700 transition-colors hover:bg-brand-50/50 focus-within:bg-brand-50/50 dark:text-gray-200 dark:hover:bg-white/5 dark:focus-within:bg-white/5"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-5 py-4">
                      {c.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && !items.length && (
        <p
          className="px-5 py-16 text-center text-sm text-gray-500"
          role="status"
        >
          {empty}
        </p>
      )}
    </div>
  );
}
