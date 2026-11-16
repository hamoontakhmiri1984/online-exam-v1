import { SITE_CONTENT_SECTIONS, type SiteContentMap, type SiteContentSection } from '../../api/cmsApi';
import type { BlogPostAdmin } from '../../api/blogApi';

export type ContentFilter = 'all' | 'published' | 'draft';
export type ContentCard = {
  key: string;
  kind: 'blog' | 'landing';
  section?: SiteContentSection;
  blogId?: string;
  title: string;
  summary: string;
  published: boolean;
  imageUrl: string | null;
  editUrl: string;
  previewUrl: string;
  date: string | null;
};

export const sectionLabels: Record<SiteContentSection, string> = {
  hero: 'بنر اصلی سایت',
  about: 'درباره ما',
  features: 'امکانات سامانه',
  pricing: 'معرفی تعرفه‌ها',
  news: 'اخبار و تازه‌ها',
  footer: 'فوتر سایت',
};

const sectionDescriptions: Record<SiteContentSection, string> = {
  hero: 'بنر و پیام اصلی صفحه اول',
  about: 'معرفی سامانه و اهداف آن',
  features: 'نمایش امکانات و قابلیت‌ها',
  pricing: 'معرفی تعرفه‌ها و اشتراک‌ها',
  news: 'اخبار و مطالب تازه',
  footer: 'اطلاعات انتهای صفحه و لینک‌ها',
};

function stringValue(data: Record<string, unknown>, names: string[]): string | null {
  for (const name of names) {
    const value = data[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function buildContentCards(
  posts: BlogPostAdmin[],
  drafts: SiteContentMap,
  hiddenSections: readonly SiteContentSection[],
): ContentCard[] {
  const articles = posts.map((post): ContentCard => ({
    key: `blog:${post.id}`,
    kind: 'blog',
    blogId: post.id,
    title: post.title,
    summary: post.excerpt,
    published: post.published,
    imageUrl: post.coverImageUrl,
    editUrl: `/blog-posts/${encodeURIComponent(post.id)}`,
    previewUrl: post.published ? `/blog/${encodeURIComponent(post.slug)}` : `/blog-posts/${encodeURIComponent(post.id)}`,
    date: post.updatedAt,
  }));

  const sections = SITE_CONTENT_SECTIONS.map((section): ContentCard => {
    const data = drafts[section] ?? {};
    return {
      key: `cms:${section}`,
      kind: 'landing',
      section,
      title: stringValue(data, ['title']) ?? sectionLabels[section],
      summary: stringValue(data, ['subtitle', 'description']) ?? sectionDescriptions[section],
      published: !hiddenSections.includes(section),
      imageUrl: stringValue(data, ['imageUrl', 'backgroundImageUrl', 'coverImageUrl']),
      editUrl: `/site-content?section=${section}`,
      previewUrl: '/',
      date: null,
    };
  });
  return [...articles, ...sections];
}

export function filterContentCards(cards: ContentCard[], filter: ContentFilter, search: string): ContentCard[] {
  const term = search.trim().toLocaleLowerCase('fa-IR');
  return cards.filter(card =>
    (filter === 'all' || (filter === 'published' ? card.published : !card.published)) &&
    (!term || `${card.title} ${card.summary} ${card.kind === 'blog' ? 'بلاگ مقاله' : 'صفحه اصلی فرود'}`.toLocaleLowerCase('fa-IR').includes(term)),
  );
}
