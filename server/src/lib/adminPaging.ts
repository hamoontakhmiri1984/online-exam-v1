import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { badRequest } from './errors';

// صفحه‌بندی و جست‌وجوی سمت سرور برای همهٔ لیست‌های مدیریتی (/admin/...)
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
const MAX_QUERY_LENGTH = 100;

function positiveInt(value: unknown, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw badRequest('پارامتر صفحه‌بندی نامعتبره');
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 1_000_000) throw badRequest('پارامتر صفحه‌بندی نامعتبره');
  return n;
}

export type Paging = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  q?: string;
};

export function parsePaging(query: Request['query']): Paging {
  const page = positiveInt(query.page, 1);
  const pageSize = positiveInt(query.pageSize, DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) throw badRequest('pageSize بیش از حد بزرگه');

  let q: string | undefined;
  if (query.q !== undefined) {
    if (typeof query.q !== 'string') throw badRequest('q نامعتبره');
    q = query.q.trim();
    if (q.length > MAX_QUERY_LENGTH) throw badRequest('q بیش از حد طولانیه');
  }

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, q: q || undefined };
}

// پارامترهای رشته‌ای اختیاری (id/status/...) - آرایه یا آبجکت در query رد می‌شود
export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw badRequest('پارامتر نامعتبره');
  return value;
}

export function pagedResult<T>(items: T[], total: number, paging: Paging) {
  return { items, total, page: paging.page, pageSize: paging.pageSize };
}

// جست‌وجوی متنی روی کاربر (نام/ایمیل/شماره/نام‌کاربری) - سمت دیتابیس
export function userSearchWhere(q?: string): Prisma.UserWhereInput {
  if (!q) return {};
  const contains = { contains: q, mode: 'insensitive' as const };
  return {
    OR: [
      { name: contains },
      { email: contains },
      { phone: contains },
      { username: contains },
    ],
  };
}