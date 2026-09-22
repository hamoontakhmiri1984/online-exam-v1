import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import {
  createQuestionBankSchema,
  updateQuestionBankSchema,
} from '../validation/questionBankSchemas';
import {
  createQuestionSchema,
  updateQuestionSchema,
  bulkQuestionsSchema,
} from '../validation/questionSchemas';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../lib/errors';
import { excelUpload } from '../lib/excelUpload';
import {
  buildQuestionImportTemplate,
  parseQuestionsExcel,
} from '../lib/questionExcel';
import { withQuotaForRole } from '../lib/quota';
// این کل فایل (چه مدیریت خودِ بانک، چه سوال‌های داخلش) فقط برای
// Instructor/SuperAdmin معناداره - Student هیچ‌وقت مستقیم به بانک سوال
// دسترسی نداره (نه موقع اجرای آزمون - اونجا از ExamQuestion.snapshot
// می‌خونه، جای دیگه‌ای که فاز آزمون‌ساز/اجرا بهش می‌رسه)
const router = Router();
router.use(requireAuth, requireRole('Instructor', 'SuperAdmin'));

function serializeBank(bank: {
  id: string;
  name: string;
  category: string;
  instructorId: string;
  _count?: { questions: number };
}) {
  return {
    id: bank.id,
    name: bank.name,
    category: bank.category,
    instructorId: bank.instructorId,
    questionCount: bank._count?.questions ?? 0,
  };
}

function serializeQuestion(q: {
  id: string;
  bankId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}) {
  return {
    id: q.id,
    bankId: q.bankId,
    text: q.text,
    options: q.options,
    correctOptionIndex: q.correctOptionIndex,
    difficulty: q.difficulty,
  };
}

// Instructor فقط بانک‌های خودش رو می‌بینه/مدیریت می‌کنه؛ SuperAdmin به همه
// دسترسی داره (دقیقاً هم‌الگوی groups.ts/exams.ts)
async function loadOwnedBank(bankId: string, userId: string, role: string) {
  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) return { bank: null, allowed: false };
  if (role === 'SuperAdmin') return { bank, allowed: true };
  return { bank, allowed: bank.instructorId === userId };
}

// ---------------------------------------------------------------------------
// بانک‌ها
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// سوال‌های داخل یه بانک
// ---------------------------------------------------------------------------

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

// دسترسی به تک‌تک سوال‌ها همیشه از طریق بانکِ والدشه (نه مستقیم از روی
// questionId)، تا هیچ‌وقت نشه با حدس‌زدن یه id سوالِ یه بانکِ دیگه رو
// ویرایش/حذف کرد
async function loadOwnedQuestion(
  bankId: string,
  questionId: string,
  userId: string,
  role: string
) {
  const { bank, allowed } = await loadOwnedBank(bankId, userId, role);
  if (!bank || !allowed) return { bank, allowed, question: null };

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question || question.bankId !== bank.id) {
    return { bank, allowed, question: null };
  }
  return { bank, allowed, question };
}

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
