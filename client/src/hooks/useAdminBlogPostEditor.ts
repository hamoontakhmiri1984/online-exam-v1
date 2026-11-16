import { useEffect, useState } from 'react';
import {
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  uploadBlogCoverImage,
  type BlogPostAdmin,
} from '../api/blogApi';
import { ApiError } from '../lib/apiClient';
import { notifySaveError, notifySaveSuccess } from '../components/Toast/Toast';

// Keep slug rules aligned with server validation.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Suggest a slug only until the user edits it manually.
function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export type BlogField = 'title' | 'slug' | 'excerpt' | 'contentMarkdown';
export type BlogFieldErrors = Partial<Record<BlogField, string>>;

function useAdminBlogPostEditor(postId: string | undefined) {
  const isEditMode = Boolean(postId);

  const [post, setPost] = useState<BlogPostAdmin | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BlogFieldErrors>({});
  const [uploadingCover, setUploadingCover] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [fallbackSlug] = useState(() => `post-${Date.now().toString(36)}`);
  const [excerpt, setExcerpt] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!postId) return;
    // Reuse the newly saved post after navigation instead of fetching it again.
    if (post && post.id === postId) return;
    setLoading(true);
    getBlogPostById(postId)
      .then((p) => {
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setSlugTouched(true);
        setExcerpt(p.excerpt);
        setContentMarkdown(p.contentMarkdown);
        setPublished(p.published);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'دریافتِ پست با خطا مواجه شد'))
      .finally(() => setLoading(false));
  }, [postId]);

  function clearFieldError(field: BlogField) {
    setFieldErrors(previous => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setError(null);
  }

  function handleTitleChange(value: string) {
    clearFieldError('title');
    setTitle(value);
    if (!slugTouched) setSlug(value.trim() ? slugify(value) || fallbackSlug : '');
  }

  function handleSlugChange(value: string) {
    clearFieldError('slug');
    setSlugTouched(true);
    setSlug(value);
  }

  function validate(): BlogFieldErrors {
    const errors: BlogFieldErrors = {};
    if (!title.trim()) errors.title = 'عنوان پست را وارد کنید.';
    else if (title.trim().length > 200) errors.title = 'عنوان نباید بیشتر از ۲۰۰ کاراکتر باشد.';
    if (!slug.trim()) errors.slug = 'آدرس (اسلاگ) پست را وارد کنید.';
    else if (slug.trim().length > 200 || !SLUG_PATTERN.test(slug.trim())) {
      errors.slug = 'اسلاگ فقط باید حروف انگلیسی کوچک، عدد و خط تیره داشته باشد (حداکثر ۲۰۰ کاراکتر).';
    }
    if (!excerpt.trim()) errors.excerpt = 'خلاصه پست را وارد کنید.';
    else if (excerpt.trim().length > 500) errors.excerpt = 'خلاصه نباید بیشتر از ۵۰۰ کاراکتر باشد.';
    if (!contentMarkdown.trim()) errors.contentMarkdown = 'محتوای پست را وارد کنید.';
    return errors;
  }

  async function handleSave(
    nextPublished?: boolean
  ): Promise<BlogPostAdmin | null> {
    const errors = validate();
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return null;

    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        contentMarkdown,
        published: nextPublished ?? published,
      };

      const saved = isEditMode
        ? await updateBlogPost(postId!, input)
        : await createBlogPost(input);

      setPost(saved);
      setPublished(saved.published);
      notifySaveSuccess(saved.published ? 'پست بلاگ ذخیره و منتشر شد' : 'پست بلاگ به‌صورت پیش‌نویس ذخیره شد');
      return saved;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'ذخیره‌سازی پست با خطا مواجه شد';
      setError(message);
      notifySaveError(message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCover(file: File) {
    if (!post) return;
    setUploadingCover(true);
    try {
      const updated = await uploadBlogCoverImage(post.id, file);
      setPost(updated);
      notifySaveSuccess('تصویر کاور با موفقیت بارگذاری شد');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'آپلودِ کاور با خطا مواجه شد'
      );
    } finally {
      setUploadingCover(false);
    }
  }

  return {
    isEditMode,
    post,
    loading,
    error,
    clearError: () => setError(null),
    fieldErrors,
    saving,
    uploadingCover,
    title,
    slug,
    excerpt,
    contentMarkdown,
    published,
    setTitle: handleTitleChange,
    setSlug: handleSlugChange,
    setExcerpt: (value: string) => { clearFieldError('excerpt'); setExcerpt(value); },
    setContentMarkdown: (value: string) => { clearFieldError('contentMarkdown'); setContentMarkdown(value); },
    setPublished,
    handleSave,
    handleUploadCover,
  };
}

export default useAdminBlogPostEditor;
