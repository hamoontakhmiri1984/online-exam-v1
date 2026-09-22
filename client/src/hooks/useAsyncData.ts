import { useCallback, useEffect, useRef, useState } from 'react';

// همون الگویی که useCrud برای error/clearError داره، اینجا برای فچ‌های ساده
// (بدون add/update/delete) هم پیاده می‌شه، تا همه‌ی صفحات از یک شکل واحد
// استفاده کنن: data / loading / error / clearError / refetch

type AsyncDataState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function useAsyncData<T>(
  fetcher: () => Promise<T>,
  initialValue: T,
  errorMessage = 'دریافت اطلاعات با خطا مواجه شد',
  // وقتی enabled=false باشه، اصلاً fetcher صدا زده نمی‌شه؛ برای موقعی که
  // نقش کاربر اصلاً مجاز به زدن اون endpoint نیست (مثلاً Student و /students)
  enabled = true
) {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: initialValue,
    loading: enabled,
    error: null,
  });

  // fetcher رو توی ref نگه می‌داریم که تغییرش (مثلاً چون هر رندر یه closure جدیده)
  // باعث فچ اضافه نشه؛ فقط refetch/mount واقعی فچ می‌کنه
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => {
    if (!enabled) {
      setState({ data: initialValue, loading: false, error: null });
      return () => {};
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcherRef
      .current()
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage, enabled]);

  useEffect(() => {
    return refetch();
  }, [refetch]);

  return {
    ...state,
    refetch,
    clearError: () => setState((prev) => ({ ...prev, error: null })),
  };
}

export default useAsyncData;