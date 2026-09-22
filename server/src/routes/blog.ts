import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest, notFound, conflict } from '../lib/errors';
import { imageUpload } from '../lib/imageUpload';
import {
  uploadPublicObject,
  getPublicObjectUrl,
  deletePublicObject,
} from '../lib/storage';
import {
  createBlogPostSchema,
  updateBlogPostSchema,
} from '../validation/blogSchemas';

const router = Router();

type BlogPostRecord = {
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
function serializeSummary(post: BlogPostRecord) {
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

function serializeDetail(post: BlogPostRecord) {
  return {
    ...serializeSummary(post),
    contentMarkdown: post.contentMarkdown,
  };
}

// خروجیِ ادمین (لیست/ویرایش): برخلاف بالا published/draft هم داره و
// contentMarkdown همیشه همراهشه (فرم ویرایش بهش نیاز داره)
function serializeAdmin(post: BlogPostRecord) {
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

const authorSelect = { author: { select: { id: true, name: true } } };

// ---------------------------------------------------------------------------
// عمومی - بدون لاگین (صفحه‌ی /blog و /blog/:slug سمت کلاینت)
// ---------------------------------------------------------------------------

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      include: authorSelect,
    });
    res.json(posts.map(serializeSummary));
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: authorSelect,
    });
    if (!post || !post.published) throw notFound('پست بلاگ یافت نشد');
    res.json(serializeDetail(post));
  })
);

// ---------------------------------------------------------------------------
// ادمین - فقط SuperAdmin (فعلاً بلاگ یه محتوای سراسریِ سایته، نه چیزی که
// هر مدرس مالِ خودش رو داشته باشه - برخلاف Handout/QuestionBank)
// ---------------------------------------------------------------------------

router.use('/admin', requireAuth, requireRole('SuperAdmin'));

router.get(
  '/admin',
  asyncHandler(async (_req, res) => {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: authorSelect,
    });
    res.json(posts.map(serializeAdmin));
  })
);

router.get(
  '/admin/:id',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      include: authorSelect,
    });
    if (!post) throw notFound('پست بلاگ یافت نشد');
    res.json(serializeAdmin(post));
  })
);

router.post(
  '/admin',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const parsed = createBlogPostSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const existing = await prisma.blogPost.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) throw conflict('این اسلاگ قبلاً استفاده شده');

    const published = parsed.data.published ?? false;
    const post = await prisma.blogPost.create({
      data: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        contentMarkdown: parsed.data.contentMarkdown,
        published,
        publishedAt: published ? new Date() : null,
        authorId: sub,
      },
      include: authorSelect,
    });
    res.status(201).json(serializeAdmin(post));
  })
);

router.put(
  '/admin/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound('پست بلاگ یافت نشد');

    const parsed = updateBlogPostSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugTaken = await prisma.blogPost.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (slugTaken) throw conflict('این اسلاگ قبلاً استفاده شده');
    }

    // published: false -> true یعنی همین الان منتشر شد (publishedAt جدید)؛
    // true -> false یعنی برگشت به draft (publishedAt پاک می‌شه)؛ اگه فیلد
    // published اصلاً تو درخواست نباشه، وضعیت انتشار فعلی دست‌نخورده می‌مونه
    let publishedAt = existing.publishedAt;
    if (parsed.data.published === true && !existing.published) {
      publishedAt = new Date();
    } else if (parsed.data.published === false) {
      publishedAt = null;
    }

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        publishedAt,
      },
      include: authorSelect,
    });
    res.json(serializeAdmin(post));
  })
);

router.delete(
  '/admin/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound('پست بلاگ یافت نشد');

    if (existing.coverImageKey) {
      await deletePublicObject(existing.coverImageKey).catch((err) =>
        console.error('deletePublicObject failed:', err)
      );
    }

    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

router.post(
  '/admin/:id/cover',
  imageUpload.single('file'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound('پست بلاگ یافت نشد');
    if (!req.file) throw badRequest('فایل تصویر ارسال نشده');

    const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const key = `blog/${existing.id}/${randomUUID()}.${extension}`;
    await uploadPublicObject(key, req.file.buffer, req.file.mimetype);

    // تصویرِ قبلی (اگه بود) رو بعد از موفقیتِ آپلودِ جدید پاک می‌کنیم - نه
    // قبلش - وگرنه اگه آپلودِ جدید fail می‌شد، پست بدون هیچ تصویری می‌موند
    if (existing.coverImageKey) {
      await deletePublicObject(existing.coverImageKey).catch((err) =>
        console.error('deletePublicObject failed:', err)
      );
    }

    const post = await prisma.blogPost.update({
      where: { id: existing.id },
      data: { coverImageKey: key },
      include: authorSelect,
    });
    res.json(serializeAdmin(post));
  })
);

export default router;
