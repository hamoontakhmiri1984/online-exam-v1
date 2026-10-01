import { apiRequest, apiMultipartRequest } from '../lib/apiClient';

// خلاصه (برای لیست /blog) - contentMarkdown نداره چون فقط برای preview/کارته
export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  publishedAt: string | null; // ISO
  authorName: string | null;
};

export type BlogPostDetail = BlogPostSummary & {
  contentMarkdown: string;
};

export type BlogPostAdmin = BlogPostDetail & {
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateBlogPostInput = {
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  published?: boolean;
};

export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;

// ---------------------------------------------------------------------------
// عمومی - بدون نیاز به لاگین (صفحه‌ی /blog و /blog/:slug)
// ---------------------------------------------------------------------------

export function getPublishedBlogPosts(): Promise<BlogPostSummary[]> {
  return apiRequest<BlogPostSummary[]>('/blog');
}

export function getBlogPostBySlug(slug: string): Promise<BlogPostDetail> {
  return apiRequest<BlogPostDetail>(`/blog/${encodeURIComponent(slug)}`);
}

// ---------------------------------------------------------------------------
// ادمین - فقط SuperAdmin (پنل CMS)
// ---------------------------------------------------------------------------

export function getAllBlogPosts(): Promise<BlogPostAdmin[]> {
  return apiRequest<BlogPostAdmin[]>('/blog/admin');
}

export function getBlogPostById(id: string): Promise<BlogPostAdmin> {
  return apiRequest<BlogPostAdmin>(`/blog/admin/${id}`);
}

export function createBlogPost(
  input: CreateBlogPostInput
): Promise<BlogPostAdmin> {
  return apiRequest<BlogPostAdmin>('/blog/admin', {
    method: 'POST',
    body: input,
  });
}

export function updateBlogPost(
  id: string,
  input: UpdateBlogPostInput
): Promise<BlogPostAdmin> {
  return apiRequest<BlogPostAdmin>(`/blog/admin/${id}`, {
    method: 'PUT',
    body: input,
  });
}

export function deleteBlogPost(id: string): Promise<void> {
  return apiRequest<void>(`/blog/admin/${id}`, { method: 'DELETE' });
}

// multipart - مثل uploadApi.ts از apiMultipartRequest استفاده می‌کنه (apiRequest
// همیشه JSON می‌فرسته)؛ refresh مشترک و یک بار retry بعد از 401 رو داره
export function uploadBlogCoverImage(
  postId: string,
  file: File
): Promise<BlogPostAdmin> {
  const formData = new FormData();
  formData.append('file', file);
  return apiMultipartRequest<BlogPostAdmin>(
    `/blog/admin/${postId}/cover`,
    formData,
    { fallbackMessage: (status) => `آپلود تصویر با خطا مواجه شد (${status})` }
  );
}