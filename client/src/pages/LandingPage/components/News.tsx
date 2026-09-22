import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { getPublishedBlogPosts, type BlogPostSummary } from '../../../api/blogApi';
import { formatDateOnly } from '../../../utils/formatDate';
import Reveal, { RevealGroup, RevealItem } from '../../../components/motion/Reveal';
import { motion } from 'framer-motion';

type NewsProps = {
  // خروجیِ NewsSectionForm (پنل ادمین -> /site-content) - فقط عنوان و
  // زیرعنوان؛ خودِ کارت‌ها از جدیدترین پست‌های منتشرشده‌ی بلاگ میان
  data?: Record<string, unknown>;
};

type NewsCard = { key: string; slug: string | null; date: string; title: string; excerpt: string };

// وقتی هنوز هیچ پستی تو بلاگ منتشر نشده، به‌جای بخشِ خالی همینا نشون داده
// می‌شن (slug=null یعنی کارت کلیک‌پذیر نیست - پستِ واقعی‌ای پشتش نیست)
const FALLBACK_ITEMS: NewsCard[] = [
  {
    key: 'fallback-1',
    slug: null,
    date: '۱۴۰۵/۰۶/۱۰',
    title: 'امکان ایمپورت گروهی سوال از اکسل',
    excerpt:
      'حالا می‌تونی صدها سوال رو یک‌جا از یه فایل اکسل وارد کنی، با پیش‌نمایش کامل قبل از ثبت نهایی.',
  },
  {
    key: 'fallback-2',
    slug: null,
    date: '۱۴۰۵/۰۵/۲۲',
    title: 'گزارش‌گیری لحظه‌ای برای مدرس‌ها',
    excerpt:
      'نمره‌ها و آمار شرکت‌کننده‌ها همون لحظه‌ای که آزمون تموم می‌شه در دسترسه، بدون تصحیح دستی.',
  },
  {
    key: 'fallback-3',
    slug: null,
    date: '۱۴۰۵/۰۴/۰۳',
    title: 'شروع رسمی سامانه‌ی آزمون آنلاین',
    excerpt:
      'نسخه‌ی اول سامانه با بانک سوال، اجرای آزمون زمان‌دار و پنل مدیریتی راه‌اندازی شد.',
  },
];

const MAX_POSTS = 3;

function readString(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value : '';
}

function News({ data }: NewsProps) {
  const title = readString(data, 'title') || 'اخبار و به‌روزرسانی‌ها';
  const subtitle =
    readString(data, 'subtitle') || 'دورهم‌های کوچیک از چیزهایی که به سامانه اضافه می‌کنیم.';

  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublishedBlogPosts()
      .then((res) => {
        if (!cancelled) setPosts(res);
      })
      .catch(() => {
        // silent - همون FALLBACK_ITEMS نشون داده می‌شه
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRealPosts = Boolean(posts && posts.length > 0);
  const items: NewsCard[] = hasRealPosts
    ? posts!.slice(0, MAX_POSTS).map((post) => ({
        key: post.id,
        slug: post.slug,
        date: post.publishedAt ? formatDateOnly(post.publishedAt) : '',
        title: post.title,
        excerpt: post.excerpt,
      }))
    : FALLBACK_ITEMS;

  return (
    <section id="news" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="mx-auto mb-14 max-w-xl text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </Reveal>

      <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const cardInner = (
            <>
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 dark:bg-brand-600/10 dark:text-brand-400">
                  <Sparkles size={12} />
                  بلاگ
                </span>
                {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
              </div>

              <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                {item.excerpt}
              </p>
            </>
          );

          const cardClass =
            'flex flex-col rounded-2xl border border-gray-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-none';

          return (
            <RevealItem key={item.key}>
              {item.slug ? (
                <Link to={`/blog/${item.slug}`} className={cardClass}>
                  {cardInner}
                </Link>
              ) : (
                <article className={cardClass}>{cardInner}</article>
              )}
            </RevealItem>
          );
        })}
      </RevealGroup>

      {hasRealPosts && (
        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Link
            to="/blog"
            className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            دیدنِ همه‌ی پست‌ها
            <ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        </motion.div>
      )}
    </section>
  );
}

export default News;
