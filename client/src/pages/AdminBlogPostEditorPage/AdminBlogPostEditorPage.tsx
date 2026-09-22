import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Save, Loader2, XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
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
      // بعدِ اولین ذخیره، پست id گرفته - آدرس رو عوض می‌کنیم تا ذخیره‌ی
      // بعدی «ویرایش» باشه نه «ساختِ دوباره»، و آپلودِ کاور هم فعال بشه
      navigate(`/blog-posts/${saved.id}`, { replace: true });
    }
  }

  return (
    <AppLayout title={isEditMode ? 'ویرایشِ پست' : 'پستِ جدید'}>
      {error && (
        <Toast message={error} tone="danger" icon={XCircle} onDismiss={clearError} />
      )}

      <button
        onClick={() => navigate('/blog-posts')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
      >
        <ArrowRight size={15} />
        بازگشت به لیستِ پست‌ها
      </button>

      {loading ? (
        <Spinner />
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>عنوان</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="عنوانِ پست"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>اسلاگ (آدرس)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={`${inputClass} font-mono ltr:text-left`}
                dir="ltr"
                placeholder="my-post-title"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>خلاصه</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className={`${inputClass} resize-y`}
              placeholder="چند خط برای کارتِ پیش‌نمایش و لیستِ بلاگ"
            />
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
            <label className={labelClass}>محتوا</label>
            <MarkdownEditor value={contentMarkdown} onChange={setContentMarkdown} />
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
