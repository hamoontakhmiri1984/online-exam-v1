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
const cmsSchemas_1 = require("../validation/cmsSchemas");
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// عمومی - بدون لاگین (صفحه‌ی فرود سمت کلاینت موقع render همه‌ی section ها
// رو یه‌جا می‌گیره تا یه رفت‌وبرگشت شبکه به‌ازای هر بخش نداشته باشه)
// ---------------------------------------------------------------------------
router.get('/', (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const rows = await prisma_1.prisma.siteContent.findMany();
    const bySection = new Map(rows.map((r) => [r.section, r.data]));
    // section هایی که هنوز هیچ‌وقت ادمین ویرایششون نکرده، object خالی
    // برمی‌گردونن (نه 404) - کامپوننت‌های صفحه‌ی فرود باید بتونن با یه
    // مقدار پیش‌فرضِ خودشون این حالت رو هندل کنن، نه اینکه صفحه‌ی فرود کلاً
    // خطا بده چون هنوز کسی از پنل ادمین محتوا نساخته
    const sections = {};
    for (const section of cmsSchemas_1.SITE_CONTENT_SECTIONS) {
        sections[section] = bySection.get(section) ?? {};
    }
    res.json({ sections });
}));
// ---------------------------------------------------------------------------
// ادمین - فقط SuperAdmin
// ---------------------------------------------------------------------------
router.use('/admin', requireAuth_1.requireAuth, (0, requireAuth_1.requireRole)('SuperAdmin'));
router.put('/admin/:section', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub } = req.user;
    const { section } = req.params;
    if (!(0, cmsSchemas_1.isSiteContentSection)(section)) {
        throw (0, errors_1.badRequest)('بخش نامعتبره');
    }
    const parsed = cmsSchemas_1.updateSiteContentSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    // Zod همین الان تضمین کرده data یه object معتبره؛ فقط برای Prisma
    // (که برای فیلد Json نوع InputJsonValue می‌خواد، نه Record<string, unknown>)
    // به‌صراحت تایپش می‌کنیم
    const data = parsed.data.data;
    const row = await prisma_1.prisma.siteContent.upsert({
        where: { section },
        create: { section, data, updatedById: sub },
        update: { data, updatedById: sub },
    });
    res.json({ section: row.section, data: row.data });
}));
// تصویر یه section (مثلاً بک‌گراند Hero) - آدرسِ برگشتی رو ادمین خودش تو
// data همون section (مثلاً data.imageUrl) می‌ذاره؛ این endpoint فقط آپلود
// می‌کنه، ساختارِ data رو تغییر نمی‌ده
router.post('/admin/:section/image', imageUpload_1.imageUpload.single('file'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { section } = req.params;
    if (!(0, cmsSchemas_1.isSiteContentSection)(section)) {
        throw (0, errors_1.badRequest)('بخش نامعتبره');
    }
    if (!req.file)
        throw (0, errors_1.badRequest)('فایل تصویر ارسال نشده');
    const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const key = `cms/${section}/${(0, node_crypto_1.randomUUID)()}.${extension}`;
    await (0, storage_1.uploadPublicObject)(key, req.file.buffer, req.file.mimetype);
    res.json({ imageUrl: (0, storage_1.getPublicObjectUrl)(key) });
}));
exports.default = router;
