import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowRight, FileX } from 'lucide-react';
import Navbar from '../LandingPage/components/Navbar';
import Footer from '../LandingPage/components/Footer';
import Spinner from '../../components/Spinner/Spinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import { getBlogPostBySlug, type BlogPostDetail } from '../../api/blogApi';
import { formatDateOnly } from '../../utils/formatDate';
import useSiteContent from '../../hooks/useSiteContent';

function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const sections = useSiteContent();

  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setPost(null);
    setNotFound(false);
    getBlogPostBySlug(slug)
      .then((res) => {
        if (!cancelled) setPost(res);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-surface-light text-gray-900 transition-colors dark:bg-surface-dark dark:text-white">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <button
          onClick={() => navigate('/blog')}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
        >
          <ArrowRight size={15} />
          بازگشت به بلاگ
        </button>

        {notFound ? (
          <EmptyState
            title="پست پیدا نشد"
            description="این پست وجود نداره یا حذف شده."
            icon={FileX}
          />
        ) : !post ? (
          <Spinner />
        ) : (
          <article>
            {post.coverImageUrl && (
              <div className="mb-8 aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <h1 className="text-3xl font-extrabold leading-[1.4] text-gray-900 dark:text-white">
              {post.title}
            </h1>

            <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              {post.publishedAt && <span>{formatDateOnly(post.publishedAt)}</span>}
              {post.authorName && (
                <>
                  <span>·</span>
                  <span>{post.authorName}</span>
                </>
              )}
            </div>

            {/* همون کلاس‌های تایپوگرافیِ پیش‌نمایشِ MarkdownEditor تو پنل
                ادمین - تا چیزی که ادمین موقعِ نوشتن دید، همینجا هم همونطور
                رندر بشه */}
            <div className="mt-8 max-w-none text-sm leading-7 text-gray-700 dark:text-gray-200 [&_a]:text-brand-600 [&_a]:underline [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_li]:mr-5 [&_ol]:list-decimal [&_p]:mb-4 [&_strong]:font-bold [&_ul]:list-disc">
              <ReactMarkdown>{post.contentMarkdown}</ReactMarkdown>
            </div>
          </article>
        )}
      </div>

      <Footer data={sections?.footer} />
    </div>
  );
}

export default BlogPostPage;
