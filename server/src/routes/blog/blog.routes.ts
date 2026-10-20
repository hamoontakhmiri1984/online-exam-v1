import { logEvent } from '../../lib/logger';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest, notFound, conflict } from '../../lib/errors';
import { extensionForImageMimeType, imageUpload } from '../../lib/imageUpload';
import { validateUploadedFile } from '../../lib/uploadValidation';
import {
  uploadPublicObject,
  deletePublicObject,
} from '../../lib/storage';
import {
  createBlogPostSchema,
  updateBlogPostSchema,
} from '../../validation/blogSchemas';

import {
  serializeSummary,
  serializeDetail,
  serializeAdmin,
  authorSelect,
} from './blog.service';

const router = Router();

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

    // Publishing assigns publishedAt; returning to draft clears it.
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
        logEvent('error', 'deletePublicObject failed:', err)
      );
    }

    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

router.post(
  '/admin/:id/cover',
  imageUpload.single('file'),
  validateUploadedFile('image'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw notFound('پست بلاگ یافت نشد');
    if (!req.file) throw badRequest('فایل تصویر ارسال نشده');

    const extension = extensionForImageMimeType(req.file.mimetype);
    const key = `blog/${existing.id}/${randomUUID()}.${extension}`;
    await uploadPublicObject(key, req.file.buffer, req.file.mimetype);

    // Delete the previous cover only after the new upload succeeds.
    if (existing.coverImageKey) {
      await deletePublicObject(existing.coverImageKey).catch((err) =>
        logEvent('error', 'deletePublicObject failed:', err)
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

// Keep the public slug matcher after the protected admin routes.
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

export default router;
