import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import {
  parsePaging,
  pagedResult,
  optionalString,
} from '../../lib/adminPaging';
import { reportRange } from '../../lib/adminReportQuery';
import { badRequest } from '../../lib/errors';

const router = Router();
const identity = { id: true, name: true, username: true } as const;
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { days, start, end, instructorId } = reportRange(req.query);
    const examScope = instructorId
      ? Prisma.sql`AND e."instructorId" = ${instructorId}`
      : Prisma.empty;
    const payScope = instructorId
      ? Prisma.sql`AND "instructorId" = ${instructorId}`
      : Prisma.empty;
    const [totals, payments, subscriptions, trend, registrations] =
      await Promise.all([
        prisma.$queryRaw<
          { started: number; completed: number; average: number | null }[]
        >(Prisma.sql`
      SELECT COUNT(*) FILTER (WHERE a."startedAt" >= ${start} AND a."startedAt" <= ${end})::int AS started,
        COUNT(*) FILTER (WHERE a."finishedAt" >= ${start} AND a."finishedAt" <= ${end})::int AS completed,
        AVG(100.0 * a."correctCount" / NULLIF(a."totalQuestions", 0)) FILTER (WHERE a."finishedAt" >= ${start} AND a."finishedAt" <= ${end})::float AS average
      FROM exam_attempts a JOIN exams e ON e.id = a."examId"
      WHERE (a."startedAt" >= ${start} OR a."finishedAt" >= ${start}) ${examScope}`),
        prisma.payment.aggregate({
          where: {
            status: 'Success',
            updatedAt: { gte: start, lte: end },
            ...(instructorId ? { instructorId } : {}),
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count FROM (
        SELECT DISTINCT ON ("instructorId") "instructorId", "planId", "endDate"
        FROM subscriptions WHERE "startDate" <= ${end} ${payScope}
        ORDER BY "instructorId", "startDate" DESC, id DESC
      ) latest WHERE "planId" != 'free' AND ("endDate" IS NULL OR "endDate" > ${end})`),
        prisma.$queryRaw<{ day: string; completed: number }[]>(Prisma.sql`
      SELECT to_char(a."finishedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran', 'YYYY-MM-DD') AS day, COUNT(*)::int AS completed
      FROM exam_attempts a JOIN exams e ON e.id = a."examId"
      WHERE a."finishedAt" >= ${start} AND a."finishedAt" <= ${end} ${examScope}
      GROUP BY day ORDER BY day`),
        instructorId
          ? Promise.resolve([])
          : prisma.$queryRaw<{ day: string; registered: number }[]>(Prisma.sql`
      SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tehran', 'YYYY-MM-DD') AS day, COUNT(*)::int AS registered
      FROM users WHERE "createdAt" >= ${start} AND "createdAt" <= ${end} AND role IN ('Student', 'Instructor') GROUP BY day ORDER BY day`),
      ]);
    const trendMap = new Map(trend.map((row) => [row.day, row.completed]));
    const registerMap = new Map(
      registrations.map((row) => [row.day, row.registered]),
    );
    const series = Array.from({ length: days }, (_, i) => {
      const day = new Date(start.getTime() + i * 86400_000 + 3.5 * 3600_000)
        .toISOString()
        .slice(0, 10);
      return {
        day,
        completed: trendMap.get(day) ?? 0,
        registered: registerMap.get(day) ?? 0,
      };
    });
    res.json({
      ...totals[0],
      revenue: payments._sum.amount ?? 0,
      successfulPayments: payments._count._all,
      activeSubscriptions: subscriptions[0]?.count ?? 0,
      series,
      from: start,
      to: end,
      timezone: 'Asia/Tehran',
      registrationSeriesAvailable: !instructorId,
    });
  }),
);
router.get(
  '/attempts',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const { start, end, instructorId } = reportRange(req.query);
    const order = optionalString(req.query.order) ?? 'newest';
    if (!['newest', 'oldest'].includes(order))
      throw badRequest('ترتیب نامعتبر است');
    const contains = { contains: paging.q, mode: 'insensitive' as const };
    const where: Prisma.ExamAttemptWhereInput = {
      finishedAt: { gte: start, lte: end },
      ...(instructorId ? { exam: { instructorId } } : {}),
      ...(paging.q
        ? {
            OR: [
              { exam: { title: contains } },
              { student: { name: contains } },
              { student: { username: contains } },
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.examAttempt.findMany({
        where,
        skip: paging.skip,
        take: paging.take,
        orderBy: [
          { finishedAt: order === 'newest' ? 'desc' : 'asc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          finishedAt: true,
          correctCount: true,
          totalQuestions: true,
          endedByTimeout: true,
          student: { select: identity },
          exam: {
            select: { id: true, title: true, instructor: { select: identity } },
          },
        },
      }),
      prisma.examAttempt.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  }),
);
router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const { start, end, instructorId } = reportRange(req.query);
    const where: Prisma.PaymentWhereInput = {
      createdAt: { gte: start, lte: end },
      ...(instructorId ? { instructorId } : {}),
      ...(paging.q
        ? {
            instructor: {
              OR: [
                { name: { contains: paging.q, mode: 'insensitive' } },
                { username: { contains: paging.q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        skip: paging.skip,
        take: paging.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          amount: true,
          planId: true,
          status: true,
          createdAt: true,
          instructor: { select: identity },
        },
      }),
      prisma.payment.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  }),
);
router.get(
  '/events',
  asyncHandler(async (req, res) => {
    const paging = parsePaging(req.query);
    const where: Prisma.AdminAuditLogWhereInput = paging.q
      ? {
          OR: [
            { action: { contains: paging.q, mode: 'insensitive' } },
            { targetId: { contains: paging.q } },
          ],
        }
      : {};
    const [items, total] = await prisma.$transaction([
      prisma.adminAuditLog.findMany({
        where,
        skip: paging.skip,
        take: paging.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          admin: { select: identity },
        },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);
    res.json(pagedResult(items, total, paging));
  }),
);
export default router;
