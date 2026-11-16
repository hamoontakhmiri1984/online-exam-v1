import Spinner from '../../components/Spinner/Spinner';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, Pencil, Plus, Trash2, LibraryBig, Users } from 'lucide-react';
import { getCurrentUser } from '../../api/authApi';
import { deletePractice, getPractices, type Practice } from '../../api/practiceApi';
import { ApiError } from '../../lib/apiClient';
import { notifySaveSuccess } from '../../components/Toast/Toast';
import ConfirmDeleteModal from '../../components/Modal/ConfirmDeleteModal';
import AppLayout from '../../components/AppLayout/AppLayout';
import LearningContentCard from '../../components/LearningContentCard/LearningContentCard';
import ListPagination from '../../components/ListPagination/ListPagination';
import usePagedList from '../../hooks/usePagedList';
import { panel, secondary, statusLabels } from './practiceUi';

export default function PracticePage() {
  const learner = getCurrentUser()?.role === 'Student';
  const list = usePagedList(getPractices);
  const [deleteTarget, setDeleteTarget] = useState<Practice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deletePractice(deleteTarget.id);
      setDeleteTarget(null);
      list.reload();
      notifySaveSuccess('تمرین با موفقیت حذف شد');
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : 'حذف تمرین انجام نشد. دوباره تلاش کنید.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout title={learner ? 'تمرین‌های من' : 'مدیریت تمرین‌ها'}>
      <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200/50 bg-gradient-to-bl from-violet-50 via-white to-white p-6 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-ink"><BookOpenCheck size={18} /> {learner ? 'یادگیری با تمرین' : 'آموزش و تمرین'}</div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{learner ? 'تمرین‌های من' : 'مجموعه‌های تمرین'}</h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">{learner ? 'تمرین کنید، بازخورد هر پاسخ را ببینید و سابقه خود را مرور کنید.' : 'بانک سؤال را آماده کنید، سؤال‌ها را انتخاب کنید و تمرین را فقط برای گروه‌های موردنظر منتشر کنید.'}</p>
          </div>
          {!learner && <div className="flex flex-wrap gap-2">
            <Link to="/question-banks" className={secondary}><LibraryBig size={17}/> مدیریت بانک سؤال</Link>
            <Link to="/practice/new" className="ui-primary-gradient inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold"><Plus size={18}/> تمرین جدید</Link>
          </div>}
        </header>
        <section className={panel}>
          <ListPagination {...list} />
          {list.error ? (
            <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
              <p>{list.error}</p><button type="button" onClick={list.reload} className="mt-2 underline">تلاش مجدد</button>
            </div>
          ) : list.loading ? (
            <Spinner label="در حال دریافت تمرین‌ها…" />
          ) : !list.items.length ? (
            <div className="py-12 text-center">
              <BookOpenCheck className="mx-auto mb-4 text-violet-400" size={36}/>
              <h2 className="font-bold text-slate-800 dark:text-white">{list.q ? 'تمرینی با این نام پیدا نشد' : 'هنوز تمرینی ثبت نشده است'}</h2>
              <p className="mt-2 text-sm text-slate-500">{learner ? 'تمرین‌های منتشرشده توسط مدرس اینجا نمایش داده می‌شوند.' : 'از بانک سؤال، اولین تمرین را بسازید.'}</p>
              {!learner && !list.q && <Link to="/practice/new" className="ui-primary-gradient mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold">ساخت اولین تمرین</Link>}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.items.map(p => learner ? (
                <article key={p.id} className="flex min-w-0 flex-col rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-violet-400/15 dark:bg-slate-800/60">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-brand-ink"><BookOpenCheck size={19}/><span className="text-xs font-semibold">مجموعه تمرین</span></span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === 'Published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>{statusLabels[p.status]}</span>
                  </div>
                  <h2 className="break-words text-base font-bold text-slate-900 dark:text-white">{p.title}</h2>
                  <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">{p.description || 'مرور سؤال‌ها همراه با بازخورد فوری'}</p>
                  <div className="my-4 flex flex-wrap gap-3 border-y border-slate-100 py-3 text-xs text-slate-500 dark:border-white/10">
                    <span>{p.questionCount.toLocaleString('fa-IR')} سؤال</span>
                    <span>{p.instructorName || 'مدرس'}</span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link to={`/practice/${p.id}`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white hover:bg-violet-700">شروع تمرین<ArrowLeft size={15}/></Link>
                  </div>
                </article>
              ) : (
                <LearningContentCard
                  key={p.id}
                  kind="practice"
                  title={p.title}
                  description={p.description || 'مرور سؤال‌ها همراه با بازخورد فوری'}
                  questionCount={p.questionCount}
                  status={
                    <span className={`ms-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${p.status === 'Published' ? 'bg-[#e6f5ec] text-[#1c6048] dark:bg-[#29473d] dark:text-[#ace6cb]' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>
                      {p.status === 'Published' && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
                      {statusLabels[p.status]}
                    </span>
                  }
                  metadata={<span className="inline-flex items-center gap-1.5"><Users size={14} aria-hidden="true" />{p.groups.length.toLocaleString('fa-IR')} گروه</span>}
                >
                  <Link to={`/practice/${p.id}`} className="learning-content-card-primary">
                    مشاهده و انتشار <ArrowLeft size={15} aria-hidden="true" />
                  </Link>
                  <Link to={`/practice/${p.id}/edit`} aria-label={`ویرایش ${p.title}`} title="ویرایش" className="learning-content-card-action"><Pencil size={16} aria-hidden="true" /></Link>
                  <button type="button" onClick={() => { setDeleteError(''); setDeleteTarget(p); }} aria-label={`حذف ${p.title}`} title="حذف" className="learning-content-card-action learning-content-card-action--delete"><Trash2 size={16} aria-hidden="true" /></button>
                </LearningContentCard>
              ))}
            </div>
          )}
        </section>
      </div>
      <ConfirmDeleteModal isOpen={!!deleteTarget} title="حذف تمرین" description={`تمرین «${deleteTarget?.title || ''}» حذف شود؟ اگر دانشجویان به آن پاسخ داده باشند، برای حفظ سوابق امکان حذف وجود ندارد؛ می‌توانید دسترسی را متوقف کنید.`} busy={deleting} error={deleteError} onConfirm={confirmDelete} onClose={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(''); } }}/>
    </AppLayout>
  );
}
