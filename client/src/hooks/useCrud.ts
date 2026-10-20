import { useEffect, useRef, useState } from 'react';

type CrudApi<T, TInput> = {
  getAll: () => Promise<T[]>;
  add?: (item: TInput) => Promise<T>;
  update?: (id: string, item: TInput) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

type CrudMessages = {
  fetch: string;
  add: string;
  update: string;
  remove: string;
  unsupported: string;
};

const DEFAULT_MESSAGES: CrudMessages = {
  fetch: 'دریافت اطلاعات با خطا مواجه شد',
  add: 'افزودن مورد جدید با خطا مواجه شد',
  update: 'ذخیره تغییرات با خطا مواجه شد',
  remove: 'حذف مورد با خطا مواجه شد',
  unsupported: 'این عملیات برای این بخش پشتیبانی نمی‌شه',
};

function useCrud<T extends { id: string }, TInput>(
  api: CrudApi<T, TInput>,
  messages: Partial<CrudMessages> = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refs provide current callbacks without retriggering fetch effects on every render.
  const apiRef = useRef(api);
  apiRef.current = api;
  const messagesRef = useRef({ ...DEFAULT_MESSAGES, ...messages });
  messagesRef.current = { ...DEFAULT_MESSAGES, ...messages };

  useEffect(() => {
    apiRef.current
      .getAll()
      .then(setItems)
      .catch(() => setError(messagesRef.current.fetch))
      .finally(() => setLoading(false));
  }, []);

  async function addItem(input: TInput): Promise<T | undefined> {
    if (!apiRef.current.add) {
      setError(messagesRef.current.unsupported);
      return undefined;
    }
    try {
      const newItem = await apiRef.current.add(input);
      setItems((prev) => [...prev, newItem]);
      return newItem;
    } catch {
      setError(messagesRef.current.add);
      return undefined;
    }
  }

  async function updateItem(id: string, input: TInput): Promise<T | undefined> {
    if (!apiRef.current.update) {
      setError(messagesRef.current.unsupported);
      return undefined;
    }
    try {
      const updated = await apiRef.current.update(id, input);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch {
      setError(messagesRef.current.update);
      return undefined;
    }
  }

  // Close dependent forms only after deletion succeeds.
  async function deleteItem(id: string): Promise<boolean> {
    try {
      await apiRef.current.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch {
      setError(messagesRef.current.remove);
      return false;
    }
  }

  function patchItem(updated: T) {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  return {
    items,
    loading,
    error,
    clearError: () => setError(null),

    canAdd: !!api.add,
    canUpdate: !!api.update,
    addItem,
    updateItem,
    deleteItem,
    patchItem,
  };
}

export default useCrud;
