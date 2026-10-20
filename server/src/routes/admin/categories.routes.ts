import { Router } from 'express';

import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest } from '../../lib/errors';
import {
  listCategoriesForAdmin,
  adminCreateCategory,
  approveCategory,
  deleteOrRejectCategory,
  renameCategory,
} from '../../lib/categories';
import {
  proposeCategorySchema,
  renameCategorySchema,
} from '../../validation/categorySchemas';
import type { CategoryStatus } from '@prisma/client';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    if (status && !['Pending', 'Approved'].includes(status)) {
      throw badRequest('status نامعتبره');
    }
    res.json(
      await listCategoriesForAdmin(status as CategoryStatus | undefined)
    );
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = proposeCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }
    res.status(201).json(await adminCreateCategory(parsed.data.name));
  })
);

router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    res.json(await approveCategory(req.params.id));
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = renameCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }
    res.json(await renameCategory(req.params.id, parsed.data.name));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteOrRejectCategory(req.params.id);
    res.status(204).send();
  })
);

export default router;
