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
import EmptyState from '../../components/EmptyState/EmptyState';
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

// سطرِ یه دسته‌بندی - جدا شده چون حالتِ ویرایشِ inline (rename) مخصوصِ
// خودشه و بهتره state ـش تو کل صفحه پخش نشه
function CategoryRow({
  category,
  showActions,
  isActioning,
  onApprove,
  onDelete,
  onRename,
}: {
  category: CategoryOption;
  showActions: boolean;
  isActioning: boolean;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => Promise<boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(category.name);

  async function submitRename(event: React.FormEvent) {
    event.preventDefault();
    const ok = await onRename(category.id, draftName);
    if (ok) setIsEditing(false);
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 transition duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="py-3">
        {isEditing ? (
          <form onSubmit={submitRename} className="flex gap-2">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={isActioning || !draftName.trim()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition disabled:cursor-not-allowed disabled:opacity-50"
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
      <td className="py-3 text-gray-400 dark:text-gray-500">
        {category.status === 'Pending' ? 'در انتظار تایید' : 'تاییدشده'}
      </td>
      {showActions && (
        <td className="py-3">
          {!isEditing && (
            <div className="flex gap-2">
              {category.status === 'Pending' && (
                <button
                  onClick={() => onApprove(category.id)}
                  disabled={isActioning}
                  className="rounded-lg bg-success-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-500 transition disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1">
                  <Pencil size={14} />
                  تغییرِ نام
                </span>
              </button>
              <button
                onClick={() => onDelete(category.id)}
                disabled={isActioning}
                className="rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 transition disabled:cursor-not-allowed disabled:opacity-50"
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
  const [newName, setNewName] = useState('');

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
        <h1 className="text-2xl font-bold dark:text-white">دسته‌بندی‌ها</h1>
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

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
        {loading ? (
          <Spinner />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="کسی اینجا نیست"
            description={EMPTY_STATE_TEXT[tab]}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-125 text-right text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2">نام</th>
                  <th className="py-2">وضعیت</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    showActions
                    isActioning={actioningId === category.id}
                    onApprove={handleApprove}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AdminCategoriesPage;
