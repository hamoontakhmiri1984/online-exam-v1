import { useCallback, useEffect, useState } from 'react';
import {
  getAllBlogPosts,
  deleteBlogPost,
  type BlogPostAdmin,
} from '../api/blogApi';
import { ApiError } from '../lib/apiClient';

function useAdminBlogPosts() {
  const [posts, setPosts] = useState<BlogPostAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAllBlogPosts()
      .then(setPosts)
      .catch(() => setError('دریافتِ لیستِ پست‌ها با خطا مواجه شد'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteBlogPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'حذفِ پست با خطا مواجه شد'
      );
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  return {
    posts,
    loading,
    error,
    clearError: () => setError(null),
    deletingId,
    handleDelete,
    refresh: load,
  };
}

export default useAdminBlogPosts;
