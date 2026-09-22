import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import Navbar from '../LandingPage/components/Navbar';
import Footer from '../LandingPage/components/Footer';
import Spinner from '../../components/Spinner/Spinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import { getPublishedBlogPosts, type BlogPostSummary } from '../../api/blogApi';
import { formatDateOnly } from '../../utils/formatDate';
import useSiteContent from '../../hooks/useSiteContent';

function BlogPage() {
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);
  const [error, setError] = useState(false);
  // فوتر باید همون محتوایی رو نشون بده که تو صفحه‌ی فرود هست (لینک‌ها،
  // شبکه‌های اجتماعی و ...) - نه نسخه‌ی هاردکدِ پیش‌فرض
  const sections = useSiteContent();

  useEffect(() => {
    let cancelled = false;
    getPublishedBlogPosts()
      .then((res) => {
        if (!cancelled) setPosts(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-light text-gray-900 transition-colors dark:bg-surface-dark dark:text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            بلاگ
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
            آخرین خبرها و به‌روزرسانی‌های سامانه.
          </p>
        </div>

        {posts === null && !error ? (
          <Spinner />
        ) : error || posts?.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="فعلاً پستی منتشر نشده"
            description="به‌زودی اولین پست این‌جا نشون داده می‌شه."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts!.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-none"
              >
                {post.coverImageUrl && (
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={post.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  {post.publishedAt && (
                    <span className="mb-2 text-xs text-gray-400">
                      {formatDateOnly(post.publishedAt)}
                    </span>
                  )}
                  <h2 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                    {post.title}
                  </h2>
                  <p className="line-clamp-3 text-xs leading-6 text-gray-500 dark:text-gray-400">
                    {post.excerpt}
                  </p>
                  {post.authorName && (
                    <span className="mt-4 text-xs font-medium text-gray-400 dark:text-gray-500">
                      نویسنده: {post.authorName}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer data={sections?.footer} />
    </div>
  );
}

export default BlogPage;
