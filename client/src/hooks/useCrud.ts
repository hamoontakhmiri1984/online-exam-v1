import { useEffect, useRef, useState } from 'react';

type CrudApi<T, TInput> = {
  getAll: () => Promise<T[]>;
  // add/update اختیاری شدن: بعضی موجودیت‌ها (مثل Student) اصلاً endpoint
  // ساخت/ویرایش مستقیم روی backend ندارن، پس صفحه‌ای مثل StudentsPage نباید
  // مجبور باشه یه تابع Promise.reject(...) الکی بسازه فقط برای این‌که تایپ
  // پر بشه. اگه صفحه‌ای add/update نداشت، دکمه‌ی متناظرش هم اصلاً نباید
  // رندر بشه.
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

// پیام‌های پیش‌فرض یک‌جا تعریف شدن؛ هر صفحه در صورت نیاز می‌تونه فقط همونی که
// می‌خواد رو override کنه (مثلاً «دریافت دانشجویان با خطا مواجه شد» به‌جای پیام عمومی)
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

  // api و messages رو توی ref نگه می‌داریم تا effect زیر همیشه به آخرین نسخه
  // دسترسی داشته باشه، بدون اینکه لازم باشه (و بدون اینکه اشتباهاً فراموش بشه)
  // در dependency array بیان - چون این دو تا شیء هر رندر می‌تونن رفرنس جدید
  // بگیرن حتی اگه محتواشون عوض نشده باشه
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

  // true یعنی حذف موفق بود؛ صفحه‌هایی که بعد از حذف کار اضافه دارن (مثلاً
  // بستن فرمِ ویرایش) باید به همین تکیه کنن، نه اینکه بی‌قید فرض کنن حذف شده
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
    // نمایان می‌کنیم که آیا add/update اصلاً روی این api پیاده‌سازی شدن یا نه؛
    // صفحه می‌تونه ازش استفاده کنه تا دکمه‌ی «افزودن»/«ویرایش» رو اصلاً رندر نکنه
    canAdd: !!api.add,
    canUpdate: !!api.update,
    addItem,
    updateItem,
    deleteItem,
    patchItem,
  };
}

export default useCrud;
