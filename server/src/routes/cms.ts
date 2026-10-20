import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest } from '../lib/errors';
import { extensionForImageMimeType, imageUpload } from '../lib/imageUpload';
import { validateUploadedFile } from '../lib/uploadValidation';
import { uploadPublicObject, getPublicObjectUrl } from '../lib/storage';
import {
  SITE_CONTENT_SECTIONS,
  isSiteContentSection,
  updateSiteContentSchema,
} from '../validation/cmsSchemas';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteContent.findMany();
    const bySection = new Map(rows.map((r) => [r.section, r.data]));

    // Missing CMS sections return empty data so the client can use defaults.
    const sections: Record<string, unknown> = {};
    for (const section of SITE_CONTENT_SECTIONS) {
      sections[section] = bySection.get(section) ?? {};
    }
    res.json({ sections });
  })
);

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

    const data = parsed.data.data as Prisma.InputJsonValue;

    const row = await prisma.siteContent.upsert({
      where: { section },
      create: { section, data, updatedById: sub },
      update: { data, updatedById: sub },
    });
    res.json({ section: row.section, data: row.data });
  })
);

router.post(
  '/admin/:section/image',
  imageUpload.single('file'),
  validateUploadedFile('image'),
  asyncHandler(async (req, res) => {
    const { section } = req.params;
    if (!isSiteContentSection(section)) {
      throw badRequest('بخش نامعتبره');
    }
    if (!req.file) throw badRequest('فایل تصویر ارسال نشده');

    const extension = extensionForImageMimeType(req.file.mimetype);
    const key = `cms/${section}/${randomUUID()}.${extension}`;
    await uploadPublicObject(key, req.file.buffer, req.file.mimetype);

    res.json({ imageUrl: getPublicObjectUrl(key) });
  })
);

export default router;
