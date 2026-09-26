import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Pencil, Plus, Trash2, XCircle } from 'lucide-react';

import { getCurrentUser } from '../../api/authApi';
import AppLayout from '../../components/AppLayout/AppLayout';
import EmptyState from '../../components/EmptyState/EmptyState';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import CategorySelect from '../../components/CategorySelect/CategorySelect';

import useQuestionBanks from '../../hooks/useQuestionBanks';

import type {
  QuestionBank,
  QuestionBankInput,
} from '../../api/questionBankApi';

const EMPTY_FORM: QuestionBankInput = {
  name: '',
  category: '',
};

function QuestionBanksPage() {
  const navigate = useNavigate();
  // SuperAdmin پنل محتوا نیست: بک‌اند دیگه ایجاد/ویرایش/حذف بانک رو ازش
  // قبول نمی‌کنه (server/src/routes/questionBanks/banks.routes.ts) - فقط
  // مشاهده برای نظارت باقی می‌مونه
  const canManage = getCurrentUser()?.role !== 'SuperAdmin';

  const { banks, loading, error, clearError, addBank, updateBank, deleteBank } =
    useQuestionBanks();

  const [form, setForm] = useState<QuestionBankInput>(EMPTY_FORM);

  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);

  const [saving, setSaving] = useState(false);

  const isEditing = editingBank !== null;

  function resetForm() {
    setEditingBank(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(bank: QuestionBank) {
    setEditingBank(bank);

    setForm({
      name: bank.name,
      category: bank.category,
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name || !form.category) return;

    setSaving(true);

    try {
      if (editingBank) {
        const updated = await updateBank(editingBank.id, {
          name,
          category: form.category,
        });

        if (updated) resetForm();

        return;
      }

      const created = await addBank({
        name,
        category: form.category,
      });

      if (created) resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bank: QuestionBank) {
    const confirmed = window.confirm(
      `بانک «${bank.name}» و تمام سوال‌های داخل آن حذف شوند؟`
    );

    if (!confirmed) return;

    const removed = await deleteBank(bank.id);

    // اگه حذف شکست خورد، فرمِ ویرایش رو پاک نکن
    if (removed && editingBank?.id === bank.id) {
      resetForm();
    }
  }

  return (
    <AppLayout title="بانک سوال">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={clearError}
        />
      )}

      <div
        className={`grid gap-6 ${
          canManage ? 'lg:grid-cols-[340px_minmax(0,1fr)]' : ''
        }`}
      >
        {canManage && (
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
          <div className="mb-5 flex items-center gap-2">
            <Plus size={20} className="text-brand-600" />

            <h2 className="font-bold text-gray-900 dark:text-white">
              {isEditing ? 'ویرایش بانک سوال' : 'بانک سوال جدید'}
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 dark:text-gray-300">
                نام بانک
              </label>

              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="مثلاً سوالات ریاضی دهم"
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-brand-900"
              />
            </div>

            <CategorySelect
              label="دسته‌بندی"
              value={form.category}
              onChange={(category) =>
                setForm((current) => ({
                  ...current,
                  category,
                }))
              }
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !form.name.trim() || !form.category}
                className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'در حال ذخیره...'
                  : isEditing
                  ? 'ذخیره تغییرات'
                  : 'ساخت بانک'}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  انصراف
                </button>
              )}
            </div>
          </div>
          </form>
        )}

        <section>
          {loading ? (
            <Spinner />
          ) : banks.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="هنوز بانک سوالی نداری"
              description="اولین بانک سوالت رو بساز و سوال‌ها رو داخلش مدیریت کن."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {banks.map((bank) => (
                // کلیکِ ماوس روی هرجای کارت جزئیات رو باز می‌کنه. برای کیبورد،
                // خودِ کارت فوکوس نمی‌گیره (قبلاً role="button" + onKeyDown روی
                // کارت بود و Enter/Space روی دکمه‌های ویرایش/حذف داخلش بالا
                // می‌اومد و به‌جای اون‌ها صفحه‌ی جزئیات باز می‌شد)؛ به‌جاش
                // اسمِ بانک یه <button> واقعیه و Enter/Space روش همون کلیکِ
                // کارت رو صدا می‌زنه.
                <article
                  key={bank.id}
                  onClick={() => navigate(`/question-banks/${bank.id}`)}
                  className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-800"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        <button
                          type="button"
                          className="block max-w-full truncate rounded text-start hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:hover:text-brand-400"
                        >
                          {bank.name}
                        </button>
                      </h3>

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {bank.category}
                      </p>
                    </div>

                    <BookOpen size={20} className="shrink-0 text-brand-600" />
                  </div>

                  <div className="mb-5 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
                    {bank.questionCount} سوال
                  </div>

                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEdit(bank);
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Pencil size={15} />
                        ویرایش
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(bank);
                        }}
                        className="flex items-center justify-center rounded-lg border border-danger-200 px-3 py-2 text-danger-600 transition hover:bg-danger-50 dark:border-danger-900 dark:text-danger-400 dark:hover:bg-danger-950/30"
                        aria-label={`حذف ${bank.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

export default QuestionBanksPage;