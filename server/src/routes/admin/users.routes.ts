import { Router } from 'express';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { badRequest, notFound } from '../../lib/errors';
import {
  optionalString,
  pagedResult,
  parsePaging,
  userSearchWhere,
} from '../../lib/adminPaging';
import { loadCurrentPlans, loadInstructorStats } from '../../lib/adminStats';
import instructorDetailRoutes from './instructorDetail.routes';

// همهٔ مسیرهای این فایل زیر /admin/users هستند و requireRole('SuperAdmin')
// در admin.ts روی کل /admin اعمال شده است
const router = Router();

const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

const instructorSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  username: true,
  approvalStatus: true,
  organizationName: true,
  createdAt: true,
} as const;

// فهرست مدرس‌ها: ?status=Pending|Approved|Rejected (بدون آن: همه)، ?q=، ?page=
router.get(
  '/instructors',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const status = optionalString(req.query.status);
    if (status && !APPROVAL_STATUSES.includes(status as ApprovalStatus)) {
      throw badRequest('status نامعتبره');
    }

    const where: Prisma.UserWhereInput = {
      role: 'Instructor',
      ...(status ? { approvalStatus: status as ApprovalStatus } : {}),
      ...userSearchWhere(paging.q),
    };

    const [rows, total, statusGroups] = await Promise.all([
      prisma.user.findMany({
        where,
        select: instructorSelect,
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.user.count({ where }),
      // شمارش هر وضعیت برای نشانگر تب‌ها (مستقل از فیلتر و جست‌وجو)
      prisma.user.groupBy({
        by: ['approvalStatus'],
        where: { role: 'Instructor' },
        _count: { _all: true },
      }),
    ]);

    const ids = rows.map((r) => r.id);
    const [stats, plans] = await Promise.all([
      loadInstructorStats(ids),
      loadCurrentPlans(ids),
    ]);

    const statusCounts = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const g of statusGroups) {
      statusCounts[g.approvalStatus] = g._count._all;
    }

    res.json({
      ...pagedResult(
        rows.map((r) => ({
          ...r,
          plan: plans.get(r.id),
          stats: stats.get(r.id),
        })),
        total,
        paging
      ),
      statusCounts,
    });
  })
);

router.use('/instructors/:instructorId', instructorDetailRoutes);

const studentGroupsSelect = {
  groupsMember: {
    select: {
      id: true,
      name: true,
      category: true,
      instructor: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  },
} as const satisfies Prisma.UserSelect;

type StudentWithGroups = {
  groupsMember: {
    id: string;
    name: string;
    category: string;
    instructor: { id: string; name: string | null };
  }[];
};

// مدرس‌های مرتبط از عضویت گروه‌ها استخراج می‌شوند (دانشجو مالک واحد ندارد)
function groupByInstructor(student: StudentWithGroups) {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      groups: { id: string; name: string; category: string }[];
    }
  >();
  for (const g of student.groupsMember) {
    const entry = map.get(g.instructor.id) ?? {
      id: g.instructor.id,
      name: g.instructor.name ?? '',
      groups: [],
    };
    entry.groups.push({ id: g.id, name: g.name, category: g.category });
    map.set(g.instructor.id, entry);
  }
  return [...map.values()];
}

const studentBaseSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  username: true,
  createdAt: true,
} as const;

// فهرست دانشجوها: ?q=، ?instructorId=، ?ungrouped=true (دانشجوهای بدون گروه)
router.get(
  '/students',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const instructorId = optionalString(req.query.instructorId);
    const ungrouped = req.query.ungrouped === 'true';
    if (instructorId && ungrouped) {
      throw badRequest('instructorId و ungrouped با هم قابل استفاده نیستند');
    }

    const where: Prisma.UserWhereInput = {
      role: 'Student',
      ...userSearchWhere(paging.q),
      ...(instructorId ? { groupsMember: { some: { instructorId } } } : {}),
      ...(ungrouped ? { groupsMember: { none: {} } } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { ...studentBaseSelect, ...studentGroupsSelect },
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      prisma.user.count({ where }),
    ]);

    res.json(
      pagedResult(
        rows.map(({ groupsMember, ...student }) => ({
          ...student,
          instructors: groupByInstructor({ groupsMember }),
        })),
        total,
        paging
      )
    );
  })
);

router.get(
  '/students/:studentId',
  asyncHandler(async (req, res) => {
    const student = await prisma.user.findFirst({
      where: { id: req.params.studentId, role: 'Student' },
      select: {
        ...studentBaseSelect,
        ...studentGroupsSelect,
        _count: { select: { attempts: true } },
      },
    });
    if (!student) throw notFound('دانشجو پیدا نشد');

    const { groupsMember, _count, ...rest } = student;
    res.json({
      ...rest,
      attemptsCount: _count.attempts,
      instructors: groupByInstructor({ groupsMember }),
    });
  })
);

export default router;