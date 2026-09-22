import { useCallback, useEffect, useState } from 'react';
import {
  getCategories,
  proposeCategory,
  type CategoryOption,
} from '../api/categoryApi';

// برای مصرف تو فرم‌های ساختِ گروه/آزمون: لیستِ دسته‌بندی‌های قابل‌انتخاب +
// امکانِ پیشنهادِ یه دسته‌ی جدید (که idempotent‌ـه و بلافاصله تو همین
// لیست ظاهر می‌شه، حتی قبل از تاییدِ ادمین - چون سرور Pendingِ خودِ همین
// کاربر رو هم برمی‌گردونه)
function useCategories() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProposing, setIsProposing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getCategories()
      .then(setCategories)
      .catch(() => setError('دریافتِ لیستِ دسته‌بندی‌ها با خطا مواجه شد'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory(name: string): Promise<CategoryOption | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    setIsProposing(true);
    try {
      const category = await proposeCategory(trimmed);
      setCategories((prev) =>
        prev.some((c) => c.id === category.id) ? prev : [...prev, category].sort((a, b) => a.name.localeCompare(b.name, 'fa'))
      );
      return category;
    } catch {
      setError('افزودنِ دسته‌بندی با خطا مواجه شد');
      return null;
    } finally {
      setIsProposing(false);
    }
  }

  return {
    categories,
    loading,
    error,
    clearError: () => setError(null),
    isProposing,
    addCategory,
    refresh: load,
  };
}

export default useCategories;
