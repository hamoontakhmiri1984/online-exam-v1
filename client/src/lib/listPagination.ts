export type ListQuery = { page?: number; pageSize?: number; q?: string };
export type ListPage<T> = { items: T[]; total: number; page: number; pageSize: number };

export function listQueryString(query: ListQuery = {}): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 25));
  if (query.q?.trim()) params.set('q', query.q.trim());
  return `?${params.toString()}`;
}

// Selectors and aggregate views explicitly traverse every page; list screens
// use the page API instead. A failed later request never returns a partial list.
export async function collectListPages<T extends { id: string }>(
  fetchPage: (query: ListQuery) => Promise<ListPage<T>>,
): Promise<T[]> {
  const items = new Map<string, T>();
  for (let page = 1; ; page++) {
    const result = await fetchPage({ page, pageSize: 100 });
    if (result.page !== page || result.pageSize <= 0) {
      throw new Error('پاسخ صفحه‌بندی نامعتبر است');
    }
    for (const item of result.items) items.set(item.id, item);
    if (result.page * result.pageSize >= result.total) return [...items.values()];
    if (result.items.length === 0) {
      throw new Error('پاسخ صفحه‌بندی ناقص است');
    }
  }
}
