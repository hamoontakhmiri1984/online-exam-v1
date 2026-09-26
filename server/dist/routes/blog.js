"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const imageUpload_1 = require("../lib/imageUpload");
const storage_1 = require("../lib/storage");
const blogSchemas_1 = require("../validation/blogSchemas");
const router = (0, express_1.Router)();
// خروجیِ عمومی (لیست/تک‌پست منتشرشده): contentMarkdown فقط تو حالت detail
// برمی‌گرده، نه تو لیست - لیست فقط برای preview/کارت لازمه و لازم نیست کل
// محتوا رو دانلود کنه
function serializeSummary(post) {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        coverImageUrl: post.coverImageKey
            ? (0, storage_1.getPublicObjectUrl)(post.coverImageKey)
            : null,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        authorName: post.author.name,
    };
}
function serializeDetail(post) {
    return {
        ...serializeSummary(post),
        contentMarkdown: post.contentMarkdown,
    };
}
// خروجیِ ادمین (لیست/ویرایش): برخلاف بالا published/draft هم داره و
// contentMarkdown همیشه همراهشه (فرم ویرایش بهش نیاز داره)
function serializeAdmin(post) {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        contentMarkdown: post.contentMarkdown,
        coverImageUrl: post.coverImageKey
            ? (0, storage_1.getPublicObjectUrl)(post.coverImageKey)
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
router.get('/', (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const posts = await prisma_1.prisma.blogPost.findMany({
        where: { published: true },
        orderBy: { publishedAt: 'desc' },
        include: authorSelect,
    });
    res.json(posts.map(serializeSummary));
}));
router.get('/:slug', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const post = await prisma_1.prisma.blogPost.findUnique({
        where: { slug: req.params.slug },
        include: authorSelect,
    });
    if (!post || !post.published)
        throw (0, errors_1.notFound)('پست بلاگ یافت نشد');
    res.json(serializeDetail(post));
}));
// ---------------------------------------------------------------------------
// ادمین - فقط SuperAdmin (فعلاً بلاگ یه محتوای سراسریِ سایته، نه چیزی که
// هر مدرس مالِ خودش رو داشته باشه - برخلاف Handout/QuestionBank)
// ---------------------------------------------------------------------------
router.use('/admin', requireAuth_1.requireAuth, (0, requireAuth_1.requireRole)('SuperAdmin'));
router.get('/admin', (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const posts = await prisma_1.prisma.blogPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: authorSelect,
    });
    res.json(posts.map(serializeAdmin));
}));
router.get('/admin/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const post = await prisma_1.prisma.blogPost.findUnique({
        where: { id: req.params.id },
        include: authorSelect,
    });
    if (!post)
        throw (0, errors_1.notFound)('پست بلاگ یافت نشد');
    res.json(serializeAdmin(post));
}));
router.post('/admin', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub } = req.user;
    const parsed = blogSchemas_1.createBlogPostSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const existing = await prisma_1.prisma.blogPost.findUnique({
        where: { slug: parsed.data.slug },
    });
    if (existing)
        throw (0, errors_1.conflict)('این اسلاگ قبلاً استفاده شده');
    const published = parsed.data.published ?? false;
    const post = await prisma_1.prisma.blogPost.create({
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
}));
router.put('/admin/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.blogPost.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        throw (0, errors_1.notFound)('پست بلاگ یافت نشد');
    const parsed = blogSchemas_1.updateBlogPostSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
        const slugTaken = await prisma_1.prisma.blogPost.findUnique({
            where: { slug: parsed.data.slug },
        });
        if (slugTaken)
            throw (0, errors_1.conflict)('این اسلاگ قبلاً استفاده شده');
    }
    // published: false -> true یعنی همین الان منتشر شد (publishedAt جدید)؛
    // true -> false یعنی برگشت به draft (publishedAt پاک می‌شه)؛ اگه فیلد
    // published اصلاً تو درخواست نباشه، وضعیت انتشار فعلی دست‌نخورده می‌مونه
    let publishedAt = existing.publishedAt;
    if (parsed.data.published === true && !existing.published) {
        publishedAt = new Date();
    }
    else if (parsed.data.published === false) {
        publishedAt = null;
    }
    const post = await prisma_1.prisma.blogPost.update({
        where: { id: req.params.id },
        data: {
            ...parsed.data,
            publishedAt,
        },
        include: authorSelect,
    });
    res.json(serializeAdmin(post));
}));
router.delete('/admin/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.blogPost.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        throw (0, errors_1.notFound)('پست بلاگ یافت نشد');
    if (existing.coverImageKey) {
        await (0, storage_1.deletePublicObject)(existing.coverImageKey).catch((err) => console.error('deletePublicObject failed:', err));
    }
    await prisma_1.prisma.blogPost.delete({ where: { id: req.params.id } });
    res.status(204).end();
}));
router.post('/admin/:id/cover', imageUpload_1.imageUpload.single('file'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.blogPost.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        throw (0, errors_1.notFound)('پست بلاگ یافت نشد');
    if (!req.file)
        throw (0, errors_1.badRequest)('فایل تصویر ارسال نشده');
    const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const key = `blog/${existing.id}/${(0, node_crypto_1.randomUUID)()}.${extension}`;
    await (0, storage_1.uploadPublicObject)(key, req.file.buffer, req.file.mimetype);
    // تصویرِ قبلی (اگه بود) رو بعد از موفقیتِ آپلودِ جدید پاک می‌کنیم - نه
    // قبلش - وگرنه اگه آپلودِ جدید fail می‌شد، پست بدون هیچ تصویری می‌موند
    if (existing.coverImageKey) {
        await (0, storage_1.deletePublicObject)(existing.coverImageKey).catch((err) => console.error('deletePublicObject failed:', err));
    }
    const post = await prisma_1.prisma.blogPost.update({
        where: { id: existing.id },
        data: { coverImageKey: key },
        include: authorSelect,
    });
    res.json(serializeAdmin(post));
}));
exports.default = router;
