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

// لیستِ کاملِ دسته‌بندی‌ها برای پنلِ ادمین. پیش‌فرض همون صفِ Pending (که
// نیازِ اصلیِ رسیدگیه)، با ?status=Approved یا بدونِ status هم می‌شه بقیه/همه
// رو دید - هم‌الگو با /admin/instructors
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

// اضافه‌کردنِ مستقیمِ یه دسته توسط SuperAdmin - همون لحظه Approved می‌شه
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

// تغییرِ نامِ یه دسته - با cascade رویِ گروه/آزمون/جلسه‌هایی که ازش استفاده
// کردن (جزئیات تو lib/categories.ts -> renameCategory)
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

// رد کردنِ یه پیشنهادِ Pending یا حذفِ یه دسته‌ی Approved که دیگه جایی
// استفاده نمی‌شه
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteOrRejectCategory(req.params.id);
    res.status(204).send();
  })
);

export default router;