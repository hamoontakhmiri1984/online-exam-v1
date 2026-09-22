import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, XCircle, Newspaper } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import useAdminBlogPosts from '../../hooks/useAdminBlogPosts';
import { formatExamDateTime } from '../../utils/formatDate';

function AdminBlogPostsPage() {
  const navigate = useNavigate();
  const { posts, loading, error, clearError, deletingId, handleDelete } =
    useAdminBlogPosts();

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`پستِ «${title}» حذف بشه؟ این کار برگشت‌ناپذیره.`)) return;
    await handleDelete(id);
  }

  return (
    <AppLayout title="پست‌های بلاگ">
      {error && (
        <Toast message={error} tone="danger" icon={XCircle} onDismiss={clearError} />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">پست‌های بلاگ</h1>
        <button
          onClick={() => navigate('/blog-posts/new')}
          className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <Plus size={16} />
          پستِ جدید
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
        {loading ? (
          <Spinner />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="هنوز پستی نیست"
            description="اولین پستِ بلاگ رو بساز تا این‌جا لیست بشه."
            action={{ label: 'پستِ جدید', onClick: () => navigate('/blog-posts/new') }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-right text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="py-2">عنوان</th>
                  <th className="py-2">وضعیت</th>
                  <th className="py-2">تاریخِ ایجاد</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-gray-100 text-gray-700 transition duration-200 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3">{post.title}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          post.published
                            ? 'bg-success-600/10 text-success-600'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {post.published ? 'منتشرشده' : 'پیش‌نویس'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 dark:text-gray-500">
                      {formatExamDateTime(post.createdAt)}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/blog-posts/${post.id}`)}
                          disabled={deletingId === post.id}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Pencil size={13} />
                            ویرایش
                          </span>
                        </button>
                        <button
                          onClick={() => onDelete(post.id, post.title)}
                          disabled={deletingId === post.id}
                          className="rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2 size={13} />
                            حذف
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AdminBlogPostsPage;
