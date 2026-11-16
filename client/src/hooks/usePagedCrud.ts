import { ApiError } from '../lib/apiClient';
import { notifySaveSuccess } from '../components/Toast/Toast';
import type { ListPage, ListQuery } from '../lib/listPagination';
import usePagedList from './usePagedList';

type PageApi<T, Input> = {
  getPage: (query: ListQuery) => Promise<ListPage<T>>;
  add: (input: Input) => Promise<T>;
  update: (id: string, input: Input) => Promise<T>;
  remove: (id: string) => Promise<void>;
};
export default function usePagedCrud<T extends { id: string }, Input>(
  api: PageApi<T, Input>,
  scopeKey = '',
  enabled = true,
) {
  const list = usePagedList(api.getPage, scopeKey, enabled);
  async function mutate<R>(operation: () => Promise<R>, fallback: string): Promise<R | undefined> {
    list.clearError();
    try {
      const result = await operation();
      list.reload();
      notifySaveSuccess(fallback.startsWith('حذف') ? 'مورد انتخاب‌شده با موفقیت حذف شد' : fallback.startsWith('افزودن') ? 'مورد جدید با موفقیت ثبت شد' : 'تغییرات با موفقیت ذخیره شد');
      return result;
    } catch (err) {
      list.setError(err instanceof ApiError ? err.message : fallback);
      return undefined;
    }
  }
  return {
    ...list,
    addItem: (input: Input) => mutate(() => api.add(input), 'افزودن مورد با خطا مواجه شد'),
    updateItem: (id: string, input: Input) => mutate(() => api.update(id, input), 'ذخیره تغییرات با خطا مواجه شد'),
    deleteItem: async (id: string) => {
      const result = await mutate(async () => {
        await api.remove(id);
        return true;
      }, 'حذف با خطا مواجه شد');
      return result === true;
    },
  };
}
