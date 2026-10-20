import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest } from '../lib/errors';
import {
  listCategoriesForInstructor,
  proposeCategory,
} from '../lib/categories';
import { proposeCategorySchema } from '../validation/categorySchemas';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    res.json(await listCategoriesForInstructor(sub));
  })
);

router.post(
  '/',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const parsed = proposeCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }

    const { sub } = req.user!;
    const { category, created } = await proposeCategory(sub, parsed.data.name);
    res.status(created ? 201 : 200).json(category);
  })
);

export default router;
