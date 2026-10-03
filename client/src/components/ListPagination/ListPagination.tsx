type Props = {
  page: number; pageSize: number; total: number; loading: boolean;
  q: string; setPage: (page: number) => void; setSearch: (q: string) => void;
};
export default function ListPagination({ page, pageSize, total, loading, q, setPage, setSearch }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-sm dark:text-gray-200">
      <input type="search" aria-label="جست‌وجو" placeholder="جست‌وجو..." maxLength={200}
        value={q} onChange={event => setSearch(event.target.value)}
        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600" />
      <span aria-live="polite">{total} مورد — صفحه {page} از {pages}</span>
      <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}
        className="rounded border px-3 py-2 disabled:opacity-40">قبلی</button>
      <button type="button" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}
        className="rounded border px-3 py-2 disabled:opacity-40">بعدی</button>
    </div>
  );
}
