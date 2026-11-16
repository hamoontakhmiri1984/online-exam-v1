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
  selectedId,
  onSelect,
}: {
  items: T[];
  columns: Column<T>[];
  loading?: boolean;
  empty?: string;
  selectedId?: string | null;
  onSelect?: (item: T) => void;
}) {
  return (
    <div
      className="ui-admin-table overflow-x-auto rounded-2xl border border-violet-200/50 bg-white/85 shadow-sm dark:border-violet-400/15 dark:bg-gray-900/85"
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
                  tabIndex={onSelect ? 0 : undefined}
                  aria-selected={onSelect ? selectedId === item.id : undefined}
                  onClick={onSelect ? (event) => { if (!(event.target as HTMLElement).closest("button, a, input, select, textarea")) onSelect(item); } : undefined}
                  onKeyDown={onSelect ? (event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(item); } } : undefined}
                  className={`text-gray-700 transition-colors dark:text-gray-200 ${onSelect ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-500" : ""} ${selectedId === item.id ? "ui-table-selected" : ""}`}
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
