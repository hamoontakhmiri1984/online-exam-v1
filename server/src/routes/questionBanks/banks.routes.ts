import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import {
  createQuestionBankSchema,
  updateQuestionBankSchema,
} from '../../validation/questionBankSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../../lib/errors';
import { buildQuestionImportTemplate } from '../../lib/questionExcel';

import { serializeBank, loadOwnedBank } from './questionBanks.service';

// این کل فایل فقط برای Instructor/SuperAdmin معناداره - Student هیچ‌وقت
// مستقیم به بانک سوال دسترسی نداره (نه موقع اجرای آزمون - اونجا از
// ExamQuestion.snapshot می‌خونه، جای دیگه‌ای که فاز آزمون‌ساز/اجرا بهش می‌رسه)
const router = Router();
router.use(requireAuth, requireRole('Instructor', 'SuperAdmin'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const where = role === 'SuperAdmin' ? {} : { instructorId: sub };

    const banks = await prisma.questionBank.findMany({
      where,
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(banks.map(serializeBank));
  })
);

// تمپلیت اکسل آماده برای ایمپورت - عمداً *قبل از* GET /:bankId تعریف شده
// چون اگه بعدش می‌بود، اکسپرس رشته‌ی «import-template» رو به‌عنوان بانک‌آیدی
// می‌گرفت (تطبیق روت‌ها به ترتیب تعریفه، نه به specificity)
router.get(
  '/import-template',
  asyncHandler(async (_req, res) => {
    const buffer = buildQuestionImportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="question-import-template.xlsx"'
    );
    res.send(buffer);
  })
);

router.get(
  '/:bankId',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    const withCount = await prisma.questionBank.findUnique({
      where: { id: bank.id },
      include: { _count: { select: { questions: true } } },
    });
    res.json(serializeBank(withCount!));
  })
);

// فقط Instructor بانک می‌سازه (برای خودش) - SuperAdmin پنل محتوا نیست،
// پنل تننت/پلتفرمه (همون تصمیم قبلی پروژه)
router.post(
  '/',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const parsed = createQuestionBankSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const bank = await prisma.questionBank.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        instructorId: req.user!.sub,
      },
      include: { _count: { select: { questions: true } } },
    });

    res.status(201).json(serializeBank(bank));
  })
);

router.put(
  '/:bankId',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = updateQuestionBankSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const updated = await prisma.questionBank.update({
      where: { id: bank.id },
      data: { name: parsed.data.name, category: parsed.data.category },
      include: { _count: { select: { questions: true } } },
    });

    res.json(serializeBank(updated));
  })
);

// حذف بانک، سوال‌هاش رو هم cascade می‌کنه (schema.prisma: Question.bank
// onDelete Cascade). آزمون‌هایی که قبلاً از این سوال‌ها استفاده کرده بودن
// آسیب نمی‌بینن چون ExamQuestion یه snapshot مستقل نگه می‌داره - فقط لینک
// questionId ـشون null می‌شه (onDelete SetNull)
router.delete(
  '/:bankId',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    await prisma.questionBank.delete({ where: { id: bank.id } });
    res.status(204).end();
  })
);

export default router;