import { badRequest } from './errors';

export const MAX_PAGE_SIZE = 100;
export function parseListQuery(query: Record<string, unknown>) {
  function integer(key: string, fallback: number, max: number) {
    const raw = query[key];
    if (raw === undefined) return fallback;
    if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) throw badRequest(`${key} باید عدد صحیح مثبت باشد`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value > max) throw badRequest(`${key} خارج از محدوده است`);
    return value;
  }
  const page = integer('page', 1, 1_000_000);
  const pageSize = integer('pageSize', 25, MAX_PAGE_SIZE);
  const rawSearch = query.q;
  if (rawSearch !== undefined && (typeof rawSearch !== 'string' || rawSearch.length > 200)) throw badRequest('جست‌وجو نامعتبر است');
  return { page, pageSize, skip: (page - 1) * pageSize, search: typeof rawSearch === 'string' ? rawSearch.trim() : '' };
}
