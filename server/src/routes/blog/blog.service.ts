import { getPublicObjectUrl } from '../../lib/storage';

export type BlogPostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageKey: string | null;
  published: boolean;
  publishedAt: Date | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null };
};

// خروجیِ عمومی (لیست/تک‌پست منتشرشده): contentMarkdown فقط تو حالت detail
// برمی‌گرده، نه تو لیست - لیست فقط برای preview/کارت لازمه و لازم نیست کل
// محتوا رو دانلود کنه
export function serializeSummary(post: BlogPostRecord) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageKey
      ? getPublicObjectUrl(post.coverImageKey)
      : null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    authorName: post.author.name,
  };
}

export function serializeDetail(post: BlogPostRecord) {
  return {
    ...serializeSummary(post),
    contentMarkdown: post.contentMarkdown,
  };
}

// خروجیِ ادمین (لیست/ویرایش): برخلاف بالا published/draft هم داره و
// contentMarkdown همیشه همراهشه (فرم ویرایش بهش نیاز داره)
export function serializeAdmin(post: BlogPostRecord) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    contentMarkdown: post.contentMarkdown,
    coverImageUrl: post.coverImageKey
      ? getPublicObjectUrl(post.coverImageKey)
      : null,
    published: post.published,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    authorName: post.author.name,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export const authorSelect = { author: { select: { id: true, name: true } } };