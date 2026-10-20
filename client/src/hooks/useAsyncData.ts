import { useCallback, useEffect, useRef, useState } from 'react';

type AsyncDataState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function useAsyncData<T>(
  fetcher: () => Promise<T>,
  initialValue: T,
  errorMessage = 'دریافت اطلاعات با خطا مواجه شد',
  // Disable fetching when the role cannot access the endpoint.
  enabled = true
) {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: initialValue,
    loading: enabled,
    error: null,
  });

  // Keep the latest fetcher without triggering requests on every render.
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