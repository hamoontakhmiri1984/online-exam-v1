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

// همه‌ی نقش‌ها (نه فقط Instructor) می‌تونن لیست رو بخونن - چون فرم‌های
// گروه/آزمون فقط برای Instructor باز می‌شن، ولی محدودش نمی‌کنیم که اگه
// یه‌روز SuperAdmin هم مستقیم از فرم‌های مشابه استفاده کرد، بشکنه
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { sub } = req.user!;
    res.json(await listCategoriesForInstructor(sub));
  })
);

// پیشنهادِ دسته‌بندیِ جدید (idempotent - اگه از قبل بود همونو برمی‌گردونه).
// برخلافِ GET، اینجا فقط Instructor مجازه - چون proposedById/نوتیف‌های
// SuperAdmin و کل مدلِ داده فرض کرده پیشنهاددهنده مدرسه (لاگ باگ: قبلاً
// این روت هیچ requireRole نداشت و یه دانشجو هم می‌تونست صف تاییدِ ادمین
// رو با پیشنهادهای الکی اسپم کنه).
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
