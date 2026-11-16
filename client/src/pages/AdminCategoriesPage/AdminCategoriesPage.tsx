import UiSelect from '../../components/UiSelect';
import PageHeader from '../../components/PageHeader/PageHeader';
import FilterBar, { controlClass } from '../../components/AdminUI/FilterBar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Pencil,
  Plus,
  Tags,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import useAdminCategories, {
  type CategoryTab,
} from '../../hooks/useAdminCategories';
import type { CategoryOption } from '../../api/categoryApi';

const TABS: { value: CategoryTab; label: string }[] = [
  { value: 'Pending', label: 'در انتظار تایید' },
  { value: 'Approved', label: 'تاییدشده' },
  { value: 'All', label: 'همه' },
];

const EMPTY_STATE_TEXT: Record<CategoryTab, string> = {
  Pending: 'فعلاً پیشنهادِ جدیدی برای دسته‌بندی نیست.',
  Approved: 'هنوز هیچ دسته‌بندی‌ای تایید نشده.',
  All: 'هنوز هیچ دسته‌بندی‌ای ثبت نشده.',
};

function CategoryRow({
  category,
  showActions,
  isActioning,
  onApprove,
  onDelete,
  onRename,
  selected,
  onSelect,
}: {
  category: CategoryOption;
  showActions: boolean;
  isActioning: boolean;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => Promise<boolean>;
  selected: boolean;
  onSelect: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(category.name);

  async function submitRename(event: React.FormEvent) {
    event.preventDefault();
    const ok = await onRename(category.id, draftName);
    if (ok) setIsEditing(false);
  }

  return (
    <tr tabIndex={0} aria-selected={selected} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,input,select")) onSelect(); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(); } }} className="cursor-pointer border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 transition duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-3 py-3.5">
        {isEditing ? (
          <form onSubmit={submitRename} className="flex gap-2">
            <input
              autoFocus
              aria-label="نام دسته‌بندی"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={isActioning || !draftName.trim()}
              className="ui-action-save rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              ذخیره
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftName(category.name);
                setIsEditing(false);
              }}
              className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-300"
            >
              انصراف
            </button>
          </form>
        ) : (
          category.name
        )}
      </td>
      <td className="px-3 py-3.5 text-gray-400 dark:text-gray-500">
        <StatusBadge tone={category.status === 'Pending' ? 'warning' : 'success'}>{category.status === 'Pending' ? 'در انتظار تأیید' : 'تأییدشده'}</StatusBadge>
      </td>
      {showActions && (
        <td className="py-3">
          {!isEditing && (
            <div className="flex gap-2">
              {category.status === 'Pending' && (
                <button
                  onClick={() => onApprove(category.id)}
                  disabled={isActioning}
                  className="inline-flex h-10 min-w-28 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    تایید
                  </span>
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                disabled={isActioning}
                className="inline-flex h-10 min-w-28 items-center justify-center rounded-xl border border-violet-200 bg-violet-50/60 px-3 text-xs font-semibold text-brand-ink hover:bg-violet-100 dark:border-violet-400/25 dark:bg-violet-400/10 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1">
                  <Pencil size={14} />
                  تغییرِ نام
                </span>
              </button>
              <button
                onClick={() => onDelete(category.id)}
                disabled={isActioning}
                className="inline-flex h-10 min-w-28 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1">
                  <XCircle size={14} />
                  {category.status === 'Pending' ? 'رد' : 'حذف'}
                </span>
              </button>
            </div>
          )}
        </td>
      )}
    </tr>
  );
}

function AdminCategoriesPage() {
  const {
    tab,
    setTab,
    categories,
    loading,
    error,
    clearError,
    actioningId,
    isAdding,
    handleApprove,
    handleDelete,
    handleRename,
    handleAdd,
  } = useAdminCategories();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('asc');
  const visible = categories.filter(c => c.name.includes(search.trim())).sort((a,b) => (order === 'asc' ? 1 : -1) * a.name.localeCompare(b.name, 'fa'));

  async function submitAdd(event: React.FormEvent) {
    event.preventDefault();
    const ok = await handleAdd(newName);
    if (ok) {
      setNewName('');
      setIsAddOpen(false);
    }
  }

  return (
    <AppLayout title="دسته‌بندی‌ها">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <PageHeader title="دسته‌بندی‌ها" description="سامان‌دهی دسته‌بندی‌های محتوای آموزشی" />
        <button
          onClick={() => setIsAddOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
        >
          <Plus size={16} />
          دسته‌بندیِ جدید
        </button>
      </div>

      {isAddOpen && (
        <form
          onSubmit={submitAdd}
          className="mb-4 flex gap-2 rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="مثلاً: زبان آلمانی"
            className="flex-1 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
          />
          <button
            type="submit"
            disabled={isAdding || !newName.trim()}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            افزودن
          </button>
        </form>
      )}

      <FilterBar><input aria-label="جستجوی دسته‌بندی" type="search" placeholder="جستجو" value={search} onChange={e => setSearch(e.target.value)} className={controlClass} /><UiSelect aria-label="ترتیب دسته‌بندی‌ها" value={order} onChange={e => setOrder(e.target.value)} className="min-w-44"><option value="asc">نام: صعودی</option><option value="desc">نام: نزولی</option></UiSelect></FilterBar>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.value
                ? 'ui-purple-gradient text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-2.5 px-4 py-6 text-center">
          <div className="grid size-11 place-items-center rounded-full border border-brand-200 text-brand-600 dark:border-brand-400/40 dark:text-brand-300">
            <Tags size={22} aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            دسته‌بندی‌ای پیدا نشد
          </h2>
          <p className="max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
            {search ? 'دسته‌بندی متناسب با جستجو وجود ندارد.' : EMPTY_STATE_TEXT[tab]}
          </p>
        </div>
      ) : (
        <div className="ui-admin-table overflow-hidden rounded-2xl border border-violet-200/50 bg-white/85 shadow-sm dark:border-violet-400/15 dark:bg-gray-900/85">
          <div className="overflow-x-auto">
            <table className="w-full min-w-125 text-right text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-3 py-3">نام</th>
                  <th className="py-2">وضعیت</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    showActions
                    isActioning={actioningId === category.id}
                    onApprove={handleApprove}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    selected={selectedCategoryId === category.id}
                    onSelect={() => setSelectedCategoryId(category.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminCategoriesPage;
