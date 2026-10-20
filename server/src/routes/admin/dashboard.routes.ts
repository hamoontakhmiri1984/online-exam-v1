import { Router } from 'express';
import { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';

const router = Router();

const ATTENTION_LIMIT = 5;
const RECENT_EXAMS_LIMIT = 8;

type ExamState = 'draft' | 'upcoming' | 'completed';

function examState(exam: {
  status: string;
  scheduledAt: Date;
  durationMinutes: number;
}): ExamState {
  if (exam.status === 'Draft') return 'draft';
  return exam.scheduledAt.getTime() + exam.durationMinutes * 60_000 <= Date.now()
    ? 'completed'
    : 'upcoming';
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [
      approvedInstructors,
      students,
      activeExamRows,
      pendingInstructors,
      pendingGroups,
      oldestInstructors,
      oldestGroups,
      recentExams,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: 'Instructor', approvalStatus: 'Approved' },
      }),
      prisma.user.count({ where: { role: 'Student' } }),
      // Use the application clock so active-exam metrics match serialized status.
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS "count"
        FROM "exams"
        WHERE "status" = 'Published'
          AND "scheduledAt" + "durationMinutes" * INTERVAL '1 minute' > ${new Date()}
      `),
      prisma.user.count({
        where: { role: 'Instructor', approvalStatus: 'Pending' },
      }),
      prisma.group.count({ where: { approvalStatus: 'Pending' } }),
      prisma.user.findMany({
        where: { role: 'Instructor', approvalStatus: 'Pending' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: ATTENTION_LIMIT,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      prisma.group.findMany({
        where: { approvalStatus: 'Pending' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: ATTENTION_LIMIT,
        select: {
          id: true,
          name: true,
          category: true,
          createdAt: true,
          instructor: { select: { name: true, username: true } },
        },
      }),
      prisma.exam.findMany({
        orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
        take: RECENT_EXAMS_LIMIT,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          durationMinutes: true,
          status: true,
          instructorId: true,
          instructor: {
            select: { name: true, username: true, email: true },
          },
        },
      }),
    ]);

    // Participants count started attempts, including unfinished ones.
    const examIds = recentExams.map((e) => e.id);
    const attemptRows =
      examIds.length === 0
        ? []
        : await prisma.examAttempt.groupBy({
            by: ['examId'],
            where: { examId: { in: examIds } },
            _count: { _all: true },
          });
    const participants = new Map(
      attemptRows.map((r) => [r.examId, r._count._all])
    );

    res.json({
      stats: {
        approvedInstructors,
        students,
        activeExams: activeExamRows[0]?.count ?? 0,
        pendingRequests: pendingInstructors + pendingGroups,
      },
      attention: {
        instructors: {
          total: pendingInstructors,
          items: oldestInstructors.map((u) => ({
            id: u.id,
            name: u.name || u.username || null,
            email: u.email,
            phone: u.phone,
            createdAt: u.createdAt.toISOString(),
          })),
        },
        groups: {
          total: pendingGroups,
          items: oldestGroups.map((g) => ({
            id: g.id,
            name: g.name,
            category: g.category,
            instructorName:
              g.instructor.name || g.instructor.username || null,
            createdAt: g.createdAt.toISOString(),
          })),
        },
      },
      recentExams: recentExams.map((e) => ({
        id: e.id,
        title: e.title,
        instructorId: e.instructorId,
        instructorName:
          e.instructor.name || e.instructor.username || e.instructor.email || null,
        scheduledAt: e.scheduledAt.toISOString(),
        status: examState(e),
        participants: participants.get(e.id) ?? 0,
      })),
    });
  })
);

export default router;
