import { useEffect, useState } from 'react';
import {
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  uploadBlogCoverImage,
  type BlogPostAdmin,
} from '../api/blogApi';
import { ApiError } from '../lib/apiClient';

// همون قاعده‌ی سمت سرور (server/src/validation/blogSchemas.ts) - فقط
// حروف/عدد انگلیسیِ کوچک و خط‌تیره
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// «عنوان فارسی/انگلیسی» -> یه اسلاگِ پیشنهادی؛ کاربر می‌تونه بعداً خودش
// دستی ویرایشش کنه (برای همین auto-slug فقط وقتی فعاله که کاربر هنوز
// دستی چیزی تو فیلدِ اسلاگ ننوشته)
function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function useAdminBlogPostEditor(postId: string | undefined) {
  const isEditMode = Boolean(postId);

  const [post, setPost] = useState<BlogPostAdmin | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!postId) return;
    // اگه همین الان پستی که تو state داریم خودِ همون id ـه (مثلاً
    // بلافاصله بعدِ ساختِ پستِ جدید، وقتی ریدایرکت به /blog-posts/:id
    // این افکت رو دوباره اجرا می‌کنه) نیازی به fetch دوباره و
    // نمایشِ Spinner نیست - داده از قبل موجوده
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
      .catch(() => setError('دریافتِ پست با خطا مواجه شد'))
      .finally(() => setLoading(false));
  }, [postId]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value);
  }

  function validate(): string | null {
    if (!title.trim()) return 'عنوان الزامیه';
    if (!slug.trim() || !SLUG_PATTERN.test(slug.trim())) {
      return 'اسلاگ فقط می‌تونه شامل حروف/عدد انگلیسی کوچک و خط‌تیره باشه';
    }
    if (!excerpt.trim()) return 'خلاصه الزامیه';
    if (!contentMarkdown.trim()) return 'محتوا الزامیه';
    return null;
  }

  // برمی‌گردونه: پستِ ذخیره‌شده (موفق) یا null (خطا/نامعتبر)
  async function handleSave(
    nextPublished?: boolean
  ): Promise<BlogPostAdmin | null> {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return null;
    }

    setSaving(true);
    setError(null);
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
      return saved;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'ذخیره‌سازیِ پست با خطا مواجه شد'
      );
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
    saving,
    uploadingCover,
    title,
    slug,
    excerpt,
    contentMarkdown,
    published,
    setTitle: handleTitleChange,
    setSlug: handleSlugChange,
    setExcerpt,
    setContentMarkdown,
    setPublished,
    handleSave,
    handleUploadCover,
  };
}

export default useAdminBlogPostEditor;
