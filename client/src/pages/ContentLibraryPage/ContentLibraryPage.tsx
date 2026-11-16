import './contentLibrary.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock3, ExternalLink, FileText, LayoutTemplate,
  MoreHorizontal, Newspaper, Pencil, Plus, RotateCw, Search, Send, Trash2, XCircle, EyeOff,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import UiSelect from '../../components/UiSelect';
import { singleLineMenuClass } from '../../components/AdminUI/FilterBar';
import ConfirmDeleteModal from '../../components/Modal/ConfirmDeleteModal';
import Spinner from '../../components/Spinner/Spinner';
import { notifySaveSuccess } from '../../components/Toast/Toast';
import { getAllBlogPosts, updateBlogPost, deleteBlogPost, type BlogPostAdmin } from '../../api/blogApi';
import {
  getSiteContent, getDraftSiteContent, publishSiteContentSection, unpublishSiteContentSection,
  type SiteContentMap, type SiteContentSection,
} from '../../api/cmsApi';
import { buildContentCards, filterContentCards, type ContentCard, type ContentFilter } from './contentCards';

const filters: { value: ContentFilter; label: string }[] = [
  { value: 'all', label: 'همه محتوا' },
  { value: 'published', label: 'منتشرشده' },
  { value: 'draft', label: 'پیش‌نویس‌ها' },
];
const surface = 'rounded-2xl border border-violet-200/50 bg-white/75 shadow-sm backdrop-blur-xl dark:border-violet-400/15 dark:bg-slate-900/70';

function ContentCover({ card }: { card: ContentCard }) {
  if (card.imageUrl) {
    return <img src={card.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />;
  }
  const Icon = card.kind === 'blog' ? Newspaper : LayoutTemplate;
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-bl from-violet-100/80 via-white to-indigo-50/70 dark:from-violet-900/40 dark:via-slate-900 dark:to-slate-800">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-200/70 bg-white/60 text-violet-500 shadow-lg shadow-violet-500/10 backdrop-blur-lg dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300">
        <Icon size={36} strokeWidth={1.4} />
      </div>
    </div>
  );
}

function ContentItem({ card, busy, onToggle, onDelete }: {
  card: ContentCard;
  busy: boolean;
  onToggle: (card: ContentCard) => void;
  onDelete: (card: ContentCard) => void;
}) {
  return (
    <article className={'group relative flex min-w-0 flex-col overflow-visible rounded-3xl border border-violet-200/50 bg-white/80 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 dark:border-violet-400/15 dark:bg-slate-900/75 dark:hover:border-violet-400/40'}>
      <div className="relative h-44 overflow-hidden rounded-t-3xl">
        <ContentCover card={card} />
        <span className="absolute right-3 top-3 rounded-full border border-white/50 bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
          {card.kind === 'blog' ? 'بلاگ' : 'صفحه اصلی'}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className={'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ' + (
            card.published
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
          )}>
            {card.published ? <CheckCircle2 size={13}/> : <Clock3 size={13}/>}
            {card.published ? 'منتشرشده' : 'پیش‌نویس / غیرفعال'}
          </span>
          {card.date && <span className="text-[11px] text-slate-400">{new Date(card.date).toLocaleDateString('fa-IR')}</span>}
        </div>
        <h2 className="line-clamp-2 min-h-6 text-base font-bold text-slate-900 dark:text-white">{card.title}</h2>
        <p className="line-clamp-2 min-h-10 text-xs leading-6 text-slate-500 dark:text-slate-400">{card.summary}</p>
        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggle(card)}
            className={'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all duration-200 disabled:cursor-wait disabled:opacity-50 ' + (
              card.published
                ? 'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 dark:border-violet-400/25 dark:bg-violet-400/5 dark:text-violet-200 dark:hover:bg-violet-400/10'
                : 'bg-violet-600 text-white shadow-sm shadow-violet-500/20 hover:bg-violet-700'
            )}
          >
            {card.published ? <EyeOff size={15}/> : <Send size={15}/>}
            {busy ? 'در حال انجام…' : card.published ? 'لغو انتشار' : 'انتشار'}
          </button>
          <Link
            to={card.editUrl}
            aria-label={'ویرایش ' + card.title}
            title="ویرایش"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-200 text-violet-700 transition hover:bg-violet-50 dark:border-violet-400/25 dark:text-violet-200 dark:hover:bg-violet-400/10"
          >
            <Pencil size={16}/>
          </Link>
          <details className="relative shrink-0">
            <summary aria-label={'گزینه‌های ' + card.title} title="گزینه‌های بیشتر" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
              <MoreHorizontal size={18}/>
            </summary>
            <div className="absolute bottom-12 left-0 z-20 min-w-40 rounded-xl border border-violet-100 bg-white p-1.5 text-xs shadow-xl shadow-slate-900/10 dark:border-violet-400/20 dark:bg-slate-800">
              <Link to={card.editUrl} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-white/10"><Pencil size={14}/> ویرایش</Link>
              {card.published && <Link to={card.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-white/10"><ExternalLink size={14}/> مشاهده در سایت</Link>}
              {card.kind === 'blog' && <button type="button" disabled={busy} onClick={() => onDelete(card)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10"><Trash2 size={14}/> حذف مقاله</button>}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

export default function ContentLibraryPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPostAdmin[]>([]);
  const [drafts, setDrafts] = useState<SiteContentMap | null>(null);
  const [hiddenSections, setHiddenSections] = useState<SiteContentSection[]>([]);
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'blog' | 'landing'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentCard | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [articles, draftResult, publicResult] = await Promise.all([
        getAllBlogPosts(), getDraftSiteContent(), getSiteContent(),
      ]);
      setPosts(articles);
      setDrafts(draftResult.sections);
      setHiddenSections(publicResult.hiddenSections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت محتوا انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const cards = useMemo(
    () => drafts ? buildContentCards(posts, drafts, hiddenSections) : [],
    [posts, drafts, hiddenSections],
  );
  const visibleCards = filterContentCards(cards, filter, search)
    .filter(card => kindFilter === 'all' || card.kind === kindFilter);
  const publishedCount = cards.filter(card => card.published).length;
  const draftCount = cards.length - publishedCount;

  async function toggleVisibility(card: ContentCard) {
    if (pendingKey) return;
    setPendingKey(card.key);
    setError('');
    try {
      if (card.kind === 'blog') {
        const updated = await updateBlogPost(card.blogId!, { published: !card.published });
        setPosts(old => old.map(post => post.id === updated.id ? updated : post));
      } else if (card.section) {
        if (card.published) {
          await unpublishSiteContentSection(card.section);
          setHiddenSections(old => old.includes(card.section!) ? old : [...old, card.section!]);
        } else {
          await publishSiteContentSection(card.section);
          setHiddenSections(old => old.filter(section => section !== card.section));
        }
      }
      notifySaveSuccess(card.published ? 'انتشار محتوا لغو شد؛ اطلاعات آن محفوظ است.' : 'محتوا منتشر شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت انتشار انجام نشد.');
    } finally {
      setPendingKey(null);
    }
  }

  async function confirmDelete() {
    const blogId = deleteTarget?.blogId;
    if (!deleteTarget || !blogId || pendingKey) return;
    const target = deleteTarget;
    setPendingKey(target.key);
    setError('');
    try {
      await deleteBlogPost(blogId);
      setPosts(old => old.filter(post => post.id !== blogId));
      setDeleteTarget(null);
      notifySaveSuccess('مقاله حذف شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف مقاله انجام نشد.');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <AppLayout title="مدیریت محتوا">
      <div className="space-y-6" dir="rtl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">مدیریت محتوا</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">همه نوشته‌ها و بخش‌های سایت را از یکجا مدیریت کنید.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/site-content" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white/70 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200"><LayoutTemplate size={17}/> ویرایش صفحه اصلی</Link>
            <button type="button" onClick={() => navigate('/blog-posts/new')} className="ui-primary-gradient inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-md shadow-violet-500/15"><Plus size={18}/> مقاله جدید</button>
          </div>
        </header>
        <div className={surface + ' flex flex-wrap items-center justify-between gap-4 p-4'}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="وضعیت انتشار">
            {filters.map(item => (
              <button type="button" key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={'rounded-full px-4 py-2 text-xs font-semibold transition ' + (filter === item.value ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10')}>
                {item.label} ({(item.value === 'all' ? cards.length : item.value === 'published' ? publishedCount : draftCount).toLocaleString('fa-IR')})
              </button>
            ))}
          </div>
          <button type="button" disabled={loading} onClick={() => void reload()} title="بارگذاری مجدد" aria-label="بارگذاری مجدد" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-violet-50 disabled:opacity-50 dark:hover:bg-white/10"><RotateCw size={17}/></button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className={surface + ' content-library-search flex min-h-11 min-w-50 flex-1 items-center gap-2 px-4'}>
            <Search size={18} className="shrink-0 text-slate-400"/>
            <input value={search} onChange={event => setSearch(event.target.value)} type="search" aria-label="جستجوی محتوا" placeholder="جستجوی عنوان یا توضیحات..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"/>
          </label>
          <UiSelect aria-label="نوع محتوا" value={kindFilter} onChange={event => setKindFilter(event.target.value as typeof kindFilter)} className={`w-48 max-w-full ${singleLineMenuClass}`}>
            <option value="all">همه انواع محتوا</option>
            <option value="blog">مقالات بلاگ</option>
            <option value="landing">بخش‌های صفحه اصلی</option>
          </UiSelect>
        </div>
        {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="بستن خطا"><XCircle size={18}/></button></div>}
        {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
          !drafts ? <div className={surface + ' p-10 text-center text-sm text-slate-500'}>اطلاعات بارگذاری نشد. <button type="button" onClick={() => void reload()} className="font-semibold text-violet-600">تلاش مجدد</button></div> :
          visibleCards.length === 0 ? <div className={surface + ' flex flex-col items-center gap-3 p-12 text-center'}><FileText size={32} className="text-violet-400"/><h2 className="font-bold dark:text-white">محتوایی پیدا نشد</h2><p className="text-sm text-slate-500">عبارت جست‌وجو یا فیلتر را تغییر دهید.</p></div> :
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {visibleCards.map(card => (
              <ContentItem key={card.key} card={card} busy={pendingKey !== null} onToggle={card => void toggleVisibility(card)} onDelete={setDeleteTarget}/>
            ))}
          </div>
        }
      </div>
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="حذف مقاله"
        description={'آیا مقاله «' + (deleteTarget?.title ?? '') + '» حذف شود؟ این کار قابل بازگشت نیست.'}
        busy={pendingKey !== null}
        onConfirm={confirmDelete}
        onClose={() => { if (!pendingKey) setDeleteTarget(null); }}
        error={error || undefined}
      />
    </AppLayout>
  );
}
