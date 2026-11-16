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
      sections[section] = bySection.has(`hidden:${section}`)
        ? {}
        : (bySection.get(section) ?? {});
    }
    const hiddenSections = SITE_CONTENT_SECTIONS.filter((section) =>
      bySection.has(`hidden:${section}`),
    );
    res.json({ sections, hiddenSections });
  }),
);

router.use('/admin', requireAuth, requireRole('SuperAdmin'));
const draftKey = (section: string) => `draft:${section}`;
const hiddenKey = (section: string) => `hidden:${section}`;

// Drafts are stored separately from published content. Public GET never reads them.
router.get(
  '/admin/drafts',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteContent.findMany();
    const lookup = new Map(rows.map((row) => [row.section, row.data]));
    const sections: Record<string, unknown> = {};
    for (const section of SITE_CONTENT_SECTIONS) {
      sections[section] =
        lookup.get(draftKey(section)) ?? lookup.get(section) ?? {};
    }
    res.json({ sections });
  }),
);

router.delete(
  '/admin/drafts/:section',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { section } = req.params;
    if (!isSiteContentSection(section)) throw badRequest('بخش نامعتبره');
    await prisma.siteContent.upsert({
      where: { section: draftKey(section) },
      create: { section: draftKey(section), data: {}, updatedById: sub },
      update: { data: {}, updatedById: sub },
    });
    res.json({ section, data: {} });
  }),
);

// Each landing section can be published independently without affecting others.
router.post(
  '/admin/publish/:section',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { section } = req.params;
    if (!isSiteContentSection(section)) throw badRequest('بخش نامعتبره');

    const rows = await prisma.siteContent.findMany();
    const draft = rows.find((row) => row.section === draftKey(section));
    const operations = [];
    if (draft) {
      operations.push(
        prisma.siteContent.upsert({
          where: { section },
          create: {
            section,
            data: draft.data as Prisma.InputJsonValue,
            updatedById: sub,
          },
          update: {
            data: draft.data as Prisma.InputJsonValue,
            updatedById: sub,
          },
        }),
      );
    }
    operations.push(
      prisma.siteContent.deleteMany({
        where: { section: hiddenKey(section) },
      }),
    );
    await prisma.$transaction(operations);
    res.json({ section, published: true });
  }),
);

// Keep both the live content and the draft intact so publication is reversible.
router.post(
  '/admin/unpublish/:section',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const { section } = req.params;
    if (!isSiteContentSection(section)) throw badRequest('بخش نامعتبره');

    await prisma.siteContent.upsert({
      where: { section: hiddenKey(section) },
      create: {
        section: hiddenKey(section),
        data: { hidden: true },
        updatedById: sub,
      },
      update: { data: { hidden: true }, updatedById: sub },
    });
    res.json({ section, published: false });
  }),
);

router.post(
  '/admin/publish',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    const rows = await prisma.siteContent.findMany();
    const lookup = new Map(rows.map((row) => [row.section, row.data]));
    const publishable = SITE_CONTENT_SECTIONS.filter((section) =>
      lookup.has(draftKey(section)),
    );
    await prisma.$transaction([
      ...publishable.map((section) =>
        prisma.siteContent.upsert({
          where: { section },
          create: {
            section,
            data: lookup.get(draftKey(section)) as Prisma.InputJsonValue,
            updatedById: sub,
          },
          update: {
            data: lookup.get(draftKey(section)) as Prisma.InputJsonValue,
            updatedById: sub,
          },
        }),
      ),
      ...publishable.map((section) =>
        prisma.siteContent.deleteMany({
          where: { section: hiddenKey(section) },
        }),
      ),
    ]);
    res.json({ publishedCount: publishable.length });
  }),
);

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
      where: { section: draftKey(section) },
      create: { section: draftKey(section), data, updatedById: sub },
      update: { data, updatedById: sub },
    });
    res.json({ section: row.section, data: row.data });
  }),
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
  }),
);

export default router;
