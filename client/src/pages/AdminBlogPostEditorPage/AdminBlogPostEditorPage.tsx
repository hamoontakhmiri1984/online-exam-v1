import PanelBack from '../../components/PanelBack/PanelBack';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import ToggleSwitch from '../../components/ToggleSwitch/ToggleSwitch';
import MarkdownEditor from '../../components/MarkdownEditor/MarkdownEditor';
import ImageUploadField from '../../components/ImageUploadField/ImageUploadField';
import useAdminBlogPostEditor from '../../hooks/useAdminBlogPostEditor';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-brand-900';
const labelClass = 'text-xs font-semibold text-gray-600 dark:text-gray-300';

function AdminBlogPostEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const {
    isEditMode,
    post,
    loading,
    error,
    clearError,
    fieldErrors,
    saving,
    uploadingCover,
    title,
    slug,
    excerpt,
    contentMarkdown,
    published,
    setTitle,
    setSlug,
    setExcerpt,
    setContentMarkdown,
    setPublished,
    handleSave,
    handleUploadCover,
  } = useAdminBlogPostEditor(id);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const saved = await handleSave();
    if (saved && !isEditMode) {
      navigate(`/blog-posts/${saved.id}`, { replace: true });
    }
  }

  return (
    <AppLayout title={isEditMode ? 'ویرایشِ پست' : 'پستِ جدید'}>
      {error && <div className="form-inline-error mb-4 flex items-center justify-between gap-3" role="alert"><span>{error}</span><button type="button" aria-label="بستن خطا" onClick={clearError}><XCircle size={17}/></button></div>}

      <PanelBack onClick={() => navigate('/blog-posts')} label="بازگشت به لیستِ پست‌ها" className="mb-4" />

      {loading ? (
        <Spinner />
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="blog-title" className={labelClass}>عنوان</label>
              <input
                id="blog-title"
                value={title}
                required
                aria-invalid={!!fieldErrors.title}
                aria-describedby={fieldErrors.title ? 'blog-title-error' : undefined}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="عنوانِ پست"
              />
              {fieldErrors.title && <p id="blog-title-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{fieldErrors.title}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="blog-slug" className={labelClass}>اسلاگ (آدرس)</label>
              <input
                id="blog-slug"
                value={slug}
                required
                aria-invalid={!!fieldErrors.slug}
                aria-describedby={fieldErrors.slug ? 'blog-slug-error' : undefined}
                onChange={(e) => setSlug(e.target.value)}
                className={`${inputClass} font-mono ltr:text-left`}
                dir="ltr"
                placeholder="my-post-title"
              />
              {fieldErrors.slug && <p id="blog-slug-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{fieldErrors.slug}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="blog-excerpt" className={labelClass}>خلاصه</label>
            <textarea
              id="blog-excerpt"
              value={excerpt}
              required
              aria-invalid={!!fieldErrors.excerpt}
              aria-describedby={fieldErrors.excerpt ? 'blog-excerpt-error' : undefined}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="چند خط برای کارتِ پیش‌نمایش و لیستِ بلاگ"
            />
            {fieldErrors.excerpt && <p id="blog-excerpt-error" role="alert" className="text-xs text-red-600 dark:text-red-400">{fieldErrors.excerpt}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>کاورِ پست</label>
            <div className="max-w-sm">
              <ImageUploadField
                imageUrl={post?.coverImageUrl}
                onUpload={handleUploadCover}
                uploading={uploadingCover}
                disabled={!post}
                disabledHint="اول یه بار پست رو ذخیره کن، بعد کاور رو آپلود کن"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="blog-content" className={labelClass}>محتوا</label>
            <MarkdownEditor id="blog-content" value={contentMarkdown} onChange={setContentMarkdown} error={fieldErrors.contentMarkdown} />
          </div>

          <div className="flex items-center gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
            <ToggleSwitch
              checked={published}
              onChange={() => setPublished(!published)}
              label="انتشارِ پست"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {published ? 'منتشرشده - همه می‌تونن ببینن' : 'پیش‌نویس - فقط تو پنل دیده می‌شه'}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Save size={15} />
                ذخیره
              </>
            )}
          </button>
        </form>
      )}
    </AppLayout>
  );
}

export default AdminBlogPostEditorPage;
