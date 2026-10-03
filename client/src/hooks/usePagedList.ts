import { useCallback, useEffect, useRef, useState } from 'react';
import type { ListPage, ListQuery } from '../lib/listPagination';
import { ApiError } from '../lib/apiClient';

export default function usePagedList<T extends { id: string }>(
  fetchPage: (query: ListQuery) => Promise<ListPage<T>>,
  scopeKey = '',
  enabled = true,
) {
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const [selection, setSelection] = useState({ scopeKey, page: 1, q: '' });
  const page = selection.scopeKey === scopeKey ? selection.page : 1;
  const q = selection.scopeKey === scopeKey ? selection.q : '';
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const pageSize = 25;
  const requestKey = JSON.stringify([scopeKey, page, q, revision]);
  const [loadedKey, setLoadedKey] = useState('');
  const isCurrent = loadedKey === requestKey;
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let active = true;
    setItems([]);
    setError(null);
    if (!enabled) {
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      fetchRef.current({ page, pageSize, q })
        .then(result => {
          if (!active) return;
          const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
          if (page > lastPage) {
            setSelection({ scopeKey, page: lastPage, q });
            return;
          }
          setItems(result.items);
          setTotal(result.total);
        })
        .catch(err => {
          if (active) setError(err instanceof ApiError ? err.message : 'دریافت اطلاعات با خطا مواجه شد');
        })
        .finally(() => {
          if (active) {
            setLoading(false);
            setLoadedKey(requestKey);
          }
        });
    }, q ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scopeKey, enabled, page, q, revision, requestKey]);

  return {
    items: enabled && isCurrent ? items : [],
    total: enabled && isCurrent ? total : 0,
    page,
    pageSize,
    q,
    loading: enabled && (loading || !isCurrent),
    error: isCurrent ? error : null,
    reload,
    setError,
    clearError: () => setError(null),
    setPage: (next: number) => setSelection({ scopeKey, page: Math.max(1, next), q }),
    setSearch: (next: string) => setSelection({ scopeKey, page: 1, q: next }),
    patchItem: (updated: T) => setItems(current => current.map(item =>
      item.id === updated.id ? updated : item)),
  };
}
