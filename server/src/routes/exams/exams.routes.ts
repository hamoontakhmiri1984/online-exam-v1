import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { loadAccessibleExam, examInclude } from '../../lib/examAccess';
import {
  createExamSchema,
  updateExamSchema,
} from '../../validation/examSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../../lib/errors';
import { withQuotaForRole } from '../../lib/quota';
import { withExamWriteLock } from '../../lib/examLock';

import {
  serializeExam,
  assertOwnsAllGroups,
  assertNotInPast,
  updateExam,
} from './exams.service';

const router = Router();
router.use(requireAuth);

// لیست آزمون‌ها بسته به نقش: SuperAdmin همه، Instructor فقط آزمون‌هایی که
// روی حداقل یکی از گروه‌های خودشه، Student فقط آزمون‌هایی که عضو حداقل
// یکی از گروه‌هاشه - دقیقاً هم‌خانواده‌ی همون منطقی که groups.ts برای
// لیست گروه‌ها داره
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const where =
      role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
        ? { instructorId: sub }
        : {
            status: 'Published' as const,
            groups: { some: { students: { some: { id: sub } } } },
          };

    const exams = await prisma.exam.findMany({
      where,
      include: examInclude,
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(exams.map(serializeExam));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    res.json(serializeExam(exam));
  })
);

router.post(
  '/',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    assertNotInPast(new Date(parsed.data.scheduledAt));

    await assertOwnsAllGroups(parsed.data.groupIds, role, sub);

    // محدودیت پلن فقط برای Instructor معنا داره؛ چک و ساخت اتمیک‌ان (یه
    // تراکنش پشت قفل مدرس - lib/quota.ts)
    const exam = await withQuotaForRole(role, sub, 'activeExams', 1, (db) =>
      db.exam.create({
        data: {
          instructorId: sub,
          title: parsed.data.title,
          category: parsed.data.category,
          scheduledAt: new Date(parsed.data.scheduledAt),
          durationMinutes: parsed.data.durationMinutes,
          allowReview: parsed.data.allowReview,
          groups: { connect: parsed.data.groupIds.map((id) => ({ id })) },
        },
        include: examInclude,
      })
    );

    res.status(201).json(serializeExam(exam));
  })
);

router.put(
  '/:id',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const { exam: existing, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!existing) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = updateExamSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    // قواعد ویرایش (مالکیت گروه، زمان گذشته، قفل فیلدها بعد از شروع،
    // سهمیه‌ی activeExams) داخل exams.service.ts هستن
    const exam = await updateExam(
      req.params.id,
      role,
      sub,
      existing,
      parsed.data
    );

    res.json(serializeExam(exam));
  })
);

// Draft → Published: بعد از این دیگه دانشجوهای گروه‌های وصل‌شده می‌تونن
// ببینینش (البته هنوز تابع timing-gate رو scheduledAt هم سرجاشه). قبل از
// publish حداقل باید یه سوال داشته باشه - یه آزمون خالیِ published معنایی
// نداره و دانشجو رو وسط اجرا با صفحه‌ی خالی روبه‌رو می‌کنه
router.post(
  '/:id/publish',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    if (exam.status === 'Published') {
      return res.json(serializeExam(exam));
    }

    const questionCount = await prisma.examQuestion.count({
      where: { examId: exam.id },
    });
    if (questionCount === 0) {
      throw badRequest('قبل از انتشار، آزمون باید حداقل یه سوال داشته باشه');
    }

    const updated = await prisma.exam.update({
      where: { id: exam.id },
      data: { status: 'Published' },
      include: examInclude,
    });
    res.json(serializeExam(updated));
  })
);

// Published → Draft: برعکسِ publish. اگه حتی یه دانشجو هم آزمون رو شروع
// کرده باشه (چه هنوز در حالِ انجام چه تمام‌شده)، اجازه نمی‌دیم - چون
// loadAccessibleExam دسترسیِ دانشجو رو منوطِ به Published بودنه؛ اگه وسطِ
// آزمونِ یه دانشجو status رو Draft کنیم، همون درخواستِ finish بعدیش با
// forbidden رد می‌شه و جوابش برای همیشه گم می‌شه
router.post(
  '/:id/unpublish',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    if (exam.status === 'Draft') {
      return res.json(serializeExam(exam));
    }

    if (exam._count.attempts > 0) {
      throw badRequest(
        'این آزمون قبلاً حداقل توسطِ یه دانشجو شروع شده - نمی‌شه لغوِ انتشارش کرد'
      );
    }

    // قفل مشترک با start: اگه دانشجویی بین چک بالا و این update شروع کرده
    // باشه، اینجا (بعد از قفل) دیده می‌شه و لغو انتشار رد می‌شه
    const updated = await withExamWriteLock(
      exam.id,
      async (tx, { attemptCount }) => {
        if (attemptCount > 0) {
          throw badRequest(
            'این آزمون قبلاً حداقل توسطِ یه دانشجو شروع شده - نمی‌شه لغوِ انتشارش کرد'
          );
        }

        return tx.exam.update({
          where: { id: exam.id },
          data: { status: 'Draft' },
          include: examInclude,
        });
      }
    );
    res.json(serializeExam(updated));
  })
);

router.delete(
  '/:id',
  requireRole('Instructor', 'SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { exam, allowed } = await loadAccessibleExam(
      req.params.id,
      sub,
      role
    );
    if (!exam) throw notFound('آزمون یافت نشد');
    if (!allowed) throw forbidden();

    await prisma.exam.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;