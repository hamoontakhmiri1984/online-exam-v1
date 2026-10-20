import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, conflict } from '../lib/errors';

const router = Router();
router.use(requireAuth);

function serializeStudent(user: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  username: string | null;
}) {
  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? undefined,
    username: user.username ?? user.email ?? user.phone ?? user.id,
  };
}

router.get(
  '/',
  requireRole('SuperAdmin', 'Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;

    const where =
      role === 'SuperAdmin'
        ? { role: 'Student' as const }
        : {
            role: 'Student' as const,
            groupsMember: { some: { instructorId: sub } },
          };

    const students = await prisma.user.findMany({ where, distinct: ['id'] });
    res.json(students.map(serializeStudent));
  })
);

// Instructors remove memberships; only SuperAdmin can delete the account, subject to history constraints.
router.delete(
  '/:id',
  requireRole('SuperAdmin', 'Instructor'),
  asyncHandler(async (req, res) => {
    const student = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!student || student.role !== 'Student') {
      throw notFound('دانشجو یافت نشد');
    }

    if (req.user!.role === 'Instructor') {
      const groups = await prisma.group.findMany({
        where: {
          instructorId: req.user!.sub,
          students: { some: { id: student.id } },
        },
        select: { id: true },
      });
      await Promise.all(
        groups.map((g) =>
          prisma.group.update({
            where: { id: g.id },
            data: { students: { disconnect: { id: student.id } } },
          })
        )
      );
      return res.status(204).end();
    }

    try {
      await prisma.user.delete({ where: { id: student.id } });
      res.status(204).end();
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw conflict(
          'این دانشجو سابقه‌ی امتحان/داده‌ی مرتبط داره و قابل حذف کامل نیست'
        );
      }
      throw err;
    }
  })
);

export default router;
