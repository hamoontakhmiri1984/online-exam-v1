import { Router } from 'express';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound } from '../../lib/errors';
import {
  optionalString,
  pagedResult,
  parsePaging,
  userSearchWhere,
} from '../../lib/adminPaging';
import { loadCurrentPlans, loadInstructorStats } from '../../lib/adminStats';

// mount: /admin/users/instructors/:instructorId  (فقط SuperAdmin - admin.ts)
// هر زیرمسیر فقط دادهٔ همین مدرس را برمی‌گرداند؛ فیلتر مالکیت در where همهٔ
// کوئری‌ها اعمال می‌شود (نه در UI)
const router = Router({ mergeParams: true });

function contains(q: string) {
  return { contains: q, mode: 'insensitive' as const };
}

router.use(
  asyncHandler(async (req, res, next) => {
    const instructor = await prisma.user.findFirst({
      where: { id: req.params.instructorId, role: 'Instructor' },
      select: { id: true },
    });
    if (!instructor) throw notFound('مدرس پیدا نشد');
    res.locals.instructorId = instructor.id;
    next();
  })
);

// پروفایل و تایید: مشخصات، اشتراک فعلی، آمار و تاریخچهٔ اقدامات مدیر
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const id: string = res.locals.instructorId;

    const [user, stats, plans, history] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          username: true,
          approvalStatus: true,
          organizationName: true,
          onboardingCompleted: true,
          createdAt: true,
        },
      }),
      loadInstructorStats([id]),
      loadCurrentPlans([id]),
      prisma.adminAuditLog.findMany({
        where: { targetType: 'User', targetId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          before: true,
          after: true,
          createdAt: true,
          admin: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({ ...user, plan: plans.get(id), stats: stats.get(id), history });
  })
);

router.get(
  '/groups',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const where: Prisma.GroupWhereInput = {
      instructorId: res.locals.instructorId,
      ...(paging.q
        ? {
            OR: [
              { name: contains(paging.q) },
              { category: contains(paging.q) },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.group.findMany({
        where,
        select: {
          id: true,
          name: true,
          category: true,
          joinCode: true,
          createdAt: true,
          _count: { select: { students: true, exams: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.group.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  })
);

// دانشجوهای یکتای این مدرس با گروه‌هایی از همین مدرس که در آن‌ها عضوند
router.get(
  '/students',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const instructorId: string = res.locals.instructorId;
    const groupId = optionalString(req.query.groupId);

    const where: Prisma.UserWhereInput = {
      role: 'Student',
      groupsMember: {
        some: { instructorId, ...(groupId ? { id: groupId } : {}) },
      },
      ...userSearchWhere(paging.q),
    };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          username: true,
          createdAt: true,
          groupsMember: {
            where: { instructorId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.user.count({ where }),
    ]);
    res.json(
      pagedResult(
        rows.map(({ groupsMember, ...s }) => ({ ...s, groups: groupsMember })),
        total,
        paging
      )
    );
  })
);

router.get(
  '/lessons',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const instructorId: string = res.locals.instructorId;
    const where: Prisma.LessonSessionWhereInput = {
      groups: { some: { instructorId } },
      ...(paging.q
        ? {
            OR: [
              { title: contains(paging.q) },
              { category: contains(paging.q) },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.lessonSession.findMany({
        where,
        select: {
          id: true,
          title: true,
          category: true,
          videoType: true,
          createdAt: true,
          groups: {
            where: { instructorId },
            select: { id: true, name: true },
          },
          _count: { select: { attachments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.lessonSession.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  })
);

router.get(
  '/handouts',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const where: Prisma.HandoutWhereInput = {
      instructorId: res.locals.instructorId,
      ...(paging.q
        ? {
            OR: [
              { title: contains(paging.q) },
              { category: contains(paging.q) },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.handout.findMany({
        where,
        // fileUrl عمداً برنمی‌گردد (کلید storage است، نه لینک قابل‌استفاده)
        select: {
          id: true,
          title: true,
          category: true,
          fileName: true,
          fileSize: true,
          createdAt: true,
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.handout.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  })
);

router.get(
  '/banks',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const where: Prisma.QuestionBankWhereInput = {
      instructorId: res.locals.instructorId,
      ...(paging.q
        ? {
            OR: [
              { name: contains(paging.q) },
              { category: contains(paging.q) },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.questionBank.findMany({
        where,
        select: {
          id: true,
          name: true,
          category: true,
          createdAt: true,
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.questionBank.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  })
);

router.get(
  '/exams',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const status = optionalString(req.query.status);
    const where: Prisma.ExamWhereInput = {
      instructorId: res.locals.instructorId,
      ...(status === 'Draft' || status === 'Published' ? { status } : {}),
      ...(paging.q
        ? {
            OR: [
              { title: contains(paging.q) },
              { category: contains(paging.q) },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          scheduledAt: true,
          durationMinutes: true,
          groups: { select: { id: true, name: true } },
          _count: { select: { attempts: true, questions: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.exam.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  })
);

// نتایج همهٔ آزمون‌های این مدرس در یک کوئری (بدون درخواست جدا برای هر آزمون)
router.get(
  '/results',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const where: Prisma.ExamAttemptWhereInput = {
      exam: { instructorId: res.locals.instructorId },
      ...(paging.q
        ? {
            OR: [
              { exam: { title: contains(paging.q) } },
              { student: { name: contains(paging.q) } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.examAttempt.findMany({
        where,
        select: {
          id: true,
          correctCount: true,
          totalQuestions: true,
          startedAt: true,
          finishedAt: true,
          endedByTimeout: true,
          exam: { select: { id: true, title: true } },
          student: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.examAttempt.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  })
);

// اشتراک و پرداخت‌ها: تاریخچهٔ اشتراک (سقف ۵۰ ردیف) + پرداخت‌های صفحه‌بندی‌شده
router.get(
  '/billing',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const instructorId: string = res.locals.instructorId;
    const where: Prisma.PaymentWhereInput = { instructorId };

    const [subscriptions, payments, total, plans] = await Promise.all([
      prisma.subscription.findMany({
        where: { instructorId },
        orderBy: { startDate: 'desc' },
        take: 50,
        select: { id: true, planId: true, startDate: true, endDate: true },
      }),
      prisma.payment.findMany({
        where,
        // authority/refId داخلی درگاه‌اند و به UI مدیریتی نمی‌روند
        select: {
          id: true,
          planId: true,
          amount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.payment.count({ where }),
      loadCurrentPlans([instructorId]),
    ]);

    res.json({
      currentPlan: plans.get(instructorId),
      subscriptions,
      payments: pagedResult(payments, total, paging),
    });
  })
);

export default router;