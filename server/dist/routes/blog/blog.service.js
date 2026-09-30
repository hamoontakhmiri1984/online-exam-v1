"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorSelect = void 0;
exports.serializeSummary = serializeSummary;
exports.serializeDetail = serializeDetail;
exports.serializeAdmin = serializeAdmin;
const storage_1 = require("../../lib/storage");
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
exports.authorSelect = { author: { select: { id: true, name: true } } };
