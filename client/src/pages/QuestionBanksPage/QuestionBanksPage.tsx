import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FolderPlus, Pencil, Plus, Trash2, XCircle, LibraryBig } from 'lucide-react';
import { getCurrentUser } from '../../api/authApi';
import AppLayout from '../../components/AppLayout/AppLayout';
import EmptyState from '../../components/EmptyState/EmptyState';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import CategorySelect from '../../components/CategorySelect/CategorySelect';
import ConfirmDeleteModal from '../../components/Modal/ConfirmDeleteModal';
import Modal from '../../components/Modal/Modal';
import ListPagination from '../../components/ListPagination/ListPagination';
import useQuestionBanks from '../../hooks/useQuestionBanks';
import type { QuestionBank, QuestionBankInput } from '../../api/questionBankApi';

const blank = (): QuestionBankInput => ({ name: '', category: '' });

export default function QuestionBanksPage() {
  const navigate = useNavigate();
  const canManage = getCurrentUser()?.role === 'Instructor';
  const { banks, loading, error, clearError, addBank, updateBank, deleteBank, page, pageSize, total, q, setPage, setSearch, reload } = useQuestionBanks();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<QuestionBankInput>(blank);
  const [editing, setEditing] = useState<QuestionBank | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<QuestionBank | null>(null);
  const [deleting, setDeleting] = useState(false);

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setForm(blank());
    setFormError('');
  }
  function create() {
    setEditing(null);
    setForm(blank());
    setFormError('');
    clearError();
    setFormOpen(true);
  }
  function edit(bank: QuestionBank) {
    setEditing(bank);
    setForm({ name: bank.name, category: bank.category });
    setFormError('');
    clearError();
    setFormOpen(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const input = { name: form.name.trim(), category: form.category };
    if (input.name.length < 2 || !input.category) {
      setFormError('نام بانک باید حداقل دو حرف داشته باشد و دسته‌بندی انتخاب شود.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const saved = editing ? await updateBank(editing.id, input) : await addBank(input);
      if (saved) closeSavedForm();
      else setFormError('ذخیره انجام نشد؛ پیام خطای بالا را بررسی کنید.');
    } finally {
      setSaving(false);
    }
  }
  function closeSavedForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(blank());
    setFormError('');
  }
  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    clearError();
    try {
      if (await deleteBank(deleteTarget.id)) {
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout title="بانک سؤال">
      {error && <Toast message={error} tone="danger" icon={XCircle} onDismiss={clearError}/>}
      <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200/40 bg-gradient-to-bl from-violet-50 via-white to-white p-6 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300"><LibraryBig size={18}/> مدیریت محتوای آموزشی</div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">بانک سؤال</h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">سؤال‌ها را در بانک‌های موضوعی مرتب کنید؛ سپس برای آزمون و تمرین از آن‌ها استفاده کنید.</p>
          </div>
          {canManage && <div className="flex flex-wrap gap-2">
            <Link to="/practice" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-400/25 dark:bg-slate-800 dark:text-violet-200">مشاهده تمرین‌ها<ArrowLeft size={15}/></Link>
            <button type="button" onClick={create} className="ui-primary-gradient inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold"><Plus size={18}/> بانک جدید</button>
          </div>}
        </header>
        <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-400/15 dark:bg-slate-900 sm:p-6">
          <ListPagination {...{ page, pageSize, total, loading, q, setPage, setSearch }} />
          {loading ? <Spinner label="در حال دریافت بانک‌های سؤال…" /> : error && !banks.length ? (
            <div className="py-8 text-center text-sm text-rose-600" role="alert"><p>{error}</p><button type="button" onClick={reload} className="mt-3 underline">تلاش مجدد</button></div>
          ) : !banks.length ? (
            <div className="py-12 text-center">
              <EmptyState icon={BookOpen} title={q ? 'بانک موردنظر پیدا نشد' : 'هنوز بانک سؤالی ندارید'} description={q ? 'عبارت جستجو را تغییر دهید.' : 'برای شروع، یک بانک بسازید و سؤال‌ها را به آن اضافه کنید.'}/>
              {canManage && !q && <button type="button" onClick={create} className="ui-primary-gradient mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"><FolderPlus size={17}/> ساخت اولین بانک</button>}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {banks.map(bank => (
                <article key={bank.id} className="flex min-w-0 flex-col rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-violet-400/15 dark:bg-slate-800/60">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"><BookOpen size={21}/></span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200">{bank.questionCount.toLocaleString('fa-IR')} سؤال</span>
                  </div>
                  <h2 className="break-words font-bold text-slate-900 dark:text-white">{bank.name}</h2>
                  <p className="mb-5 mt-2 text-xs text-slate-500 dark:text-slate-400">دسته‌بندی: {bank.category || 'بدون دسته‌بندی'}</p>
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
                    <button type="button" onClick={() => navigate(`/question-banks/${bank.id}`)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white hover:bg-violet-700">مدیریت سؤال‌ها<ArrowLeft size={15}/></button>
                    {canManage && <>
                      <button type="button" onClick={() => edit(bank)} aria-label={`ویرایش ${bank.name}`} title="ویرایش" className="grid h-10 w-10 place-items-center rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-400/25 dark:text-violet-200"><Pencil size={16}/></button>
                      <button type="button" onClick={() => setDeleteTarget(bank)} aria-label={`حذف ${bank.name}`} title="حذف" className="grid h-10 w-10 place-items-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/25 dark:text-rose-300"><Trash2 size={16}/></button>
                    </>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <Modal isOpen={formOpen} onClose={closeForm} label={editing ? 'ویرایش بانک سؤال' : 'ایجاد بانک سؤال'}>
        <div dir="rtl">
          <div className="mb-5">
            <div className="mb-2 inline-flex items-center gap-2 text-violet-600 dark:text-violet-300"><FolderPlus size={20}/><h2 className="text-lg font-bold text-slate-900 dark:text-white">{editing ? 'ویرایش بانک سؤال' : 'بانک سؤال جدید'}</h2></div>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">برای مرتب‌سازی سؤال‌ها، نام واضح و دسته‌بندی مشخص انتخاب کنید.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">نام بانک
              <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required minLength={2} maxLength={160} placeholder="مثلاً ریاضی دهم ـ فصل اول" className="mt-2 min-h-11 w-full rounded-xl border border-violet-200 bg-white px-4 text-sm outline-none focus:border-violet-400 dark:border-violet-400/25 dark:bg-slate-800 dark:text-white"/>
            </label>
            <CategorySelect label="دسته‌بندی" value={form.category} onChange={category => setForm(v => ({ ...v, category }))}/>
            {formError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} disabled={saving} className="min-h-11 flex-1 rounded-xl border border-violet-200 px-4 text-sm font-semibold text-violet-700 dark:border-violet-400/25 dark:text-violet-200">انصراف</button>
              <button type="submit" disabled={saving || form.name.trim().length < 2 || !form.category} className="ui-primary-gradient min-h-11 flex-1 rounded-xl px-4 text-sm font-bold disabled:opacity-40">{saving ? 'در حال ثبت…' : editing ? 'ذخیره تغییرات' : 'ایجاد بانک'}</button>
            </div>
          </form>
        </div>
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} title="حذف بانک سؤال" description={`بانک «${deleteTarget?.name || ''}» به همراه سؤال‌های منبع حذف می‌شود. سؤال‌های کپی‌شده در تمرین‌های موجود مستقل هستند.`} busy={deleting} error={error ?? undefined} onConfirm={confirmDelete} onClose={() => { if (!deleting) setDeleteTarget(null); }}/>
    </AppLayout>
  );
}
