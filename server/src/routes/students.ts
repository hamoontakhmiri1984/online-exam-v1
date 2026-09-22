import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, conflict } from '../lib/errors';

const router = Router();
router.use(requireAuth);

// نکته‌ی مهم: تو Prisma schema مدل جدای «Student» نداریم - یه دانشجو همون
// User با role=Student ـه. username واقعیِ کاربر (ستون users.username، از
// migration add_username_to_users) اولویت داره؛ برای حساب‌هایی که هنوز
// username ندارن (قدیمی/گوگل) به email، بعد phone و آخر id برمی‌گردیم تا
// فرانت همیشه یه مقدار داشته باشه.
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

// مدرس دیگه مستقیم دانشجو نمی‌سازه (ثبت‌نام با کد عضویت خودِ auth.ts رو
// انجام می‌ده)، برای همین این روت فقط خوندن/حذف داره، نه create/update -
// دقیقاً منطبق با اینکه addStudent/updateStudent تو UI فعلی جایی صدا زده
// نمی‌شن
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

// حذف یه دانشجو دو معنی متفاوت داره بسته به نقش:
//   - Instructor: فقط از گروه‌های خودِ همون مدرس بیرونش می‌کنه (حساب کاربری
//     رو نمی‌تونه پاک کنه، چون مالک اون حساب نیست)
//   - SuperAdmin: کل حساب کاربری رو پاک می‌کنه (اگه سابقه‌ی امتحان/سابسکریپشن
//     داشته باشه ممکنه به خاطر foreign key رد بشه - این یه تصمیم عمدیه تا
//     داده‌ی نتایج امتحان گم نشه؛ اگه ترجیح می‌دی soft-delete بشه بگو)
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
      // updateMany نمی‌تونه relation چندبه‌چند رو دستکاری کنه - باید تک‌تک
      // گروه‌های خودِ این مدرس که این دانشجو توشونه رو پیدا و disconnect کنیم
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
      // فقط تعارض foreign key رو با پیام اختصاصی مدیریت کن - بقیه‌ی خطاها
      // (مثلاً قطعی دیتابیس) باید بره سمت errorHandler مرکزی، نه اینکه با
      // یه پیام گمراه‌کننده‌ی یکسان پوشونده بشه
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
