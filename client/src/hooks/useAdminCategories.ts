import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAdminCategories,
  addCategoryAsAdmin,
  approveCategory,
  renameCategory,
  deleteCategory,
} from '../api/adminApi';
import { ApiError } from '../lib/apiClient';
import type { CategoryOption, CategoryStatus } from '../api/categoryApi';

export type CategoryTab = CategoryStatus | 'All';

function useAdminCategories() {
  const [tab, setTab] = useState<CategoryTab>('Pending');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  // Only the latest list request may replace the active tab.
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    const isLatest = () => requestId === requestIdRef.current;
    setLoading(true);
    getAdminCategories(tab === 'All' ? undefined : tab)
      .then((data) => {
        if (isLatest()) setCategories(data);
      })
      .catch(() => {
        if (isLatest()) setError('دریافتِ لیستِ دسته‌بندی‌ها با خطا مواجه شد');
      })
      .finally(() => {
        if (isLatest()) setLoading(false);
      });
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id: string) {
    setActioningId(id);
    try {
      await approveCategory(id);

      setCategories((prev) =>
        tab === 'Pending' ? prev.filter((c) => c.id !== id) : prev
      );
      if (tab !== 'Pending') load();
    } catch {
      setError('تاییدِ دسته‌بندی با خطا مواجه شد');
    } finally {
      setActioningId(null);
    }
  }

  async function handleDelete(id: string) {
    setActioningId(id);
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'حذف/ردِ دسته‌بندی با خطا مواجه شد'
      );
    } finally {
      setActioningId(null);
    }
  }

  async function handleRename(id: string, name: string) {
    setActioningId(id);
    try {
      const updated = await renameCategory(id, name);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'تغییرِ نامِ دسته‌بندی با خطا مواجه شد'
      );
      return false;
    } finally {
      setActioningId(null);
    }
  }

  async function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return false;

    setIsAdding(true);
    try {
      const created = await addCategoryAsAdmin(trimmed);
      if (tab === 'Pending') {

      } else {
        setCategories((prev) => [...prev, created]);
      }
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'افزودنِ دسته‌بندی با خطا مواجه شد'
      );
      return false;
    } finally {
      setIsAdding(false);
    }
  }

  return {
    tab,
    setTab,
    categories,
    loading,
    error,
    clearError: () => setError(null),
    actioningId,
    isAdding,
    handleApprove,
    handleDelete,
    handleRename,
    handleAdd,
    refresh: load,
  };
}

export default useAdminCategories;