export type Pagination = { page: number; pageSize: number };

export function parsePagination(
  pageValue: unknown,
  pageSizeValue: unknown,
): Pagination {
  const parsedPage = Number.parseInt(String(pageValue ?? '1'), 10);
  const parsedPageSize = Number.parseInt(String(pageSizeValue ?? '25'), 10);

  return {
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize:
      Number.isFinite(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 100)
        : 25,
  };
}
