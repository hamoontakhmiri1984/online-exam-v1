import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest } from '../lib/errors';
import { imageUpload } from '../lib/imageUpload';
import { uploadPublicObject, getPublicObjectUrl } from '../lib/storage';
import {
  SITE_CONTENT_SECTIONS,
  isSiteContentSection,
  updateSiteContentSchema,
} from '../validation/cmsSchemas';

const router = Router();

// ---------------------------------------------------------------------------
// عمومی - بدون لاگین (صفحه‌ی فرود سمت کلاینت موقع render همه‌ی section ها
// رو یه‌جا می‌گیره تا یه رفت‌وبرگشت شبکه به‌ازای هر بخش نداشته باشه)
// ---------------------------------------------------------------------------

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteContent.findMany();
    const bySection = new Map(rows.map((r) => [r.section, r.data]));

    // section هایی که هنوز هیچ‌وقت ادمین ویرایششون نکرده، object خالی
    // برمی‌گردونن (نه 404) - کامپوننت‌های صفحه‌ی فرود باید بتونن با یه
    // مقدار پیش‌فرضِ خودشون این حالت رو هندل کنن، نه اینکه صفحه‌ی فرود کلاً
    // خطا بده چون هنوز کسی از پنل ادمین محتوا نساخته
    const sections: Record<string, unknown> = {};
    for (const section of SITE_CONTENT_SECTIONS) {
      sections[section] = bySection.get(section) ?? {};
    }
    res.json({ sections });
  })
);

// ---------------------------------------------------------------------------
// ادمین - فقط SuperAdmin
// ---------------------------------------------------------------------------

router.use('/admin', requireAuth, requireRole('SuperAdmin'));

router.put(
  '/admin/:section',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { section } = req.params;
    if (!isSiteContentSection(section)) {
      throw badRequest('بخش نامعتبره');
    }

    const parsed = updateSiteContentSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    // Zod همین الان تضمین کرده data یه object معتبره؛ فقط برای Prisma
    // (که برای فیلد Json نوع InputJsonValue می‌خواد، نه Record<string, unknown>)
    // به‌صراحت تایپش می‌کنیم
    const data = parsed.data.data as Prisma.InputJsonValue;

    const row = await prisma.siteContent.upsert({
      where: { section },
      create: { section, data, updatedById: sub },
      update: { data, updatedById: sub },
    });
    res.json({ section: row.section, data: row.data });
  })
);

// تصویر یه section (مثلاً بک‌گراند Hero) - آدرسِ برگشتی رو ادمین خودش تو
// data همون section (مثلاً data.imageUrl) می‌ذاره؛ این endpoint فقط آپلود
// می‌کنه، ساختارِ data رو تغییر نمی‌ده
router.post(
  '/admin/:section/image',
  imageUpload.single('file'),
  asyncHandler(async (req, res) => {
    const { section } = req.params;
    if (!isSiteContentSection(section)) {
      throw badRequest('بخش نامعتبره');
    }
    if (!req.file) throw badRequest('فایل تصویر ارسال نشده');

    const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const key = `cms/${section}/${randomUUID()}.${extension}`;
    await uploadPublicObject(key, req.file.buffer, req.file.mimetype);

    res.json({ imageUrl: getPublicObjectUrl(key) });
  })
);

export default router;