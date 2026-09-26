import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import {
  createQuestionSchema,
  updateQuestionSchema,
  bulkQuestionsSchema,
} from '../../validation/questionSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../../lib/errors';
import { excelUpload } from '../../lib/excelUpload';
import { parseQuestionsExcel } from '../../lib/questionExcel';
import { withQuotaForRole } from '../../lib/quota';

import {
  serializeQuestion,
  loadOwnedBank,
  loadOwnedQuestion,
} from './questionBanks.service';

const router = Router();
router.use(requireAuth, requireRole('Instructor', 'SuperAdmin'));

router.get(
  '/:bankId/questions',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    const questions = await prisma.question.findMany({
      where: { bankId: bank.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(questions.map(serializeQuestion));
  })
);

router.post(
  '/:bankId/questions',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = createQuestionSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    // محدودیت پلن فقط برای Instructor معنا داره - SuperAdmin معافه. چک و
    // ساخت اتمیک‌ان (تراکنش پشت قفل مدرس - lib/quota.ts)
    const question = await withQuotaForRole(role, sub, 'questions', 1, (db) =>
      db.question.create({ data: { ...parsed.data, bankId: bank.id } })
    );

    res.status(201).json(serializeQuestion(question));
  })
);

// ایمپورت دسته‌ای (اکسل) - همه‌ی سوال‌های بدنه یه‌جا به همین بانک اضافه
// می‌شن. چک محدودیت پلن اینجا با count واقعی انجام می‌شه (نه count=1)،
// چون ممکنه فایل بزرگ‌تر از ظرفیت باقی‌مونده باشه
router.post(
  '/:bankId/questions/bulk',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = bulkQuestionsSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    // ایمپورت دسته‌ای: کل دسته یا ساخته می‌شه یا هیچ‌کدوم (همون تراکنشِ
    // چکِ سهمیه)؛ تایم‌اوت بلندتر چون فایل‌های بزرگ چند صد insert دارن
    const created = await withQuotaForRole(
      role,
      sub,
      'questions',
      parsed.data.length,
      (db) =>
        Promise.all(
          parsed.data.map((q) =>
            db.question.create({ data: { ...q, bankId: bank.id } })
          )
        ),
      { timeoutMs: 60_000 }
    );

    res.status(201).json(created.map(serializeQuestion));
  })
);

// ایمپورت از فایل اکسل/CSV - همون منطق bulk بالا رو مصرف می‌کنه، فقط ورودی
// به‌جای JSON یه فایل multipart ـه که سمت سرور پارس می‌شه (lib/questionExcel).
// ردیف‌های خراب کل فایل رو باطل نمی‌کنن: سوال‌های سالم ساخته می‌شن و لیست
// خطاهای ردیف‌به‌ردیف هم تو پاسخ برمی‌گرده تا مدرس بفهمه کدوم سطر مشکل داشت.
router.post(
  '/:bankId/questions/import-excel',
  (req, res, next) => {
    excelUpload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(badRequest('حجم فایل بیشتر از حد مجاز (۱۰ مگابایت) است'));
        }
        return next(badRequest('آپلود فایل با خطا مواجه شد'));
      }
      if (err) return next(err);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    if (!req.file) {
      throw badRequest('فایلی ارسال نشده');
    }

    const { questions, errors } = parseQuestionsExcel(req.file.buffer);

    // اگه هیچ ردیف سالمی نمونده (همه خطا داشتن)، چیزی ساخته نمی‌شه - فقط
    // لیست خطاها برمی‌گرده تا مدرس فایل رو تصحیح کنه
    if (questions.length === 0) {
      return res.status(400).json({
        error: 'هیچ سوال معتبری تو فایل پیدا نشد',
        created: [],
        errors,
      });
    }

    const created = await withQuotaForRole(
      role,
      sub,
      'questions',
      questions.length,
      (db) =>
        Promise.all(
          questions.map((q) =>
            db.question.create({ data: { ...q, bankId: bank.id } })
          )
        ),
      { timeoutMs: 60_000 }
    );

    res.status(201).json({
      created: created.map(serializeQuestion),
      errors,
    });
  })
);

router.put(
  '/:bankId/questions/:id',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed, question } = await loadOwnedQuestion(
      req.params.bankId,
      req.params.id,
      sub,
      role
    );
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();
    if (!question) throw notFound('سوال یافت نشد');

    const parsed = updateQuestionSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const updated = await prisma.question.update({
      where: { id: question.id },
      data: parsed.data,
    });

    res.json(serializeQuestion(updated));
  })
);

router.delete(
  '/:bankId/questions/:id',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed, question } = await loadOwnedQuestion(
      req.params.bankId,
      req.params.id,
      sub,
      role
    );
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();
    if (!question) throw notFound('سوال یافت نشد');

    await prisma.question.delete({ where: { id: question.id } });
    res.status(204).end();
  })
);

export default router;