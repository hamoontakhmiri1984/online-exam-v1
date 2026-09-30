import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type InstructorStats = {
  groups: number;
  students: number; // دانشجوی یکتا در گروه‌های همان مدرس
  exams: number;
  banks: number;
  lessons: number; // جلسهٔ درس یکتا که به گروه‌های مدرس وصل است
  handouts: number;
};

const EMPTY: InstructorStats = {
  groups: 0,
  students: 0,
  exams: 0,
  banks: 0,
  lessons: 0,
  handouts: 0,
};

type CountRow = { instructorId: string; count: number };

// مالکیت درس از رابطهٔ واقعی Group.instructorId -> _GroupSessions استخراج
// می‌شود (LessonSession فیلد مالک مستقیم ندارد). جدول‌های _Group... همان
// جدول‌های implicit پریزما هستند: A = groups.id و B = طرف دیگر رابطه
async function distinctViaGroups(
  joinTable: '_GroupMembers' | '_GroupSessions',
  ids: string[]
): Promise<CountRow[]> {
  return prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT g."instructorId" AS "instructorId", COUNT(DISTINCT j."B")::int AS "count"
    FROM "groups" g
    JOIN ${Prisma.raw(`"${joinTable}"`)} j ON j."A" = g."id"
    WHERE g."instructorId" IN (${Prisma.join(ids)})
    GROUP BY g."instructorId"
  `);
}

// آمار چند مدرس با تعداد ثابتی کوئری (نه یکی به‌ازای هر مدرس)
export async function loadInstructorStats(
  ids: string[]
): Promise<Map<string, InstructorStats>> {
  const result = new Map<string, InstructorStats>();
  if (ids.length === 0) return result;
  for (const id of ids) result.set(id, { ...EMPTY });

  const [groups, exams, banks, handouts, students, lessons] =
    await Promise.all([
      prisma.group.groupBy({
        by: ['instructorId'],
        where: { instructorId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.exam.groupBy({
        by: ['instructorId'],
        where: { instructorId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.questionBank.groupBy({
        by: ['instructorId'],
        where: { instructorId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.handout.groupBy({
        by: ['instructorId'],
        where: { instructorId: { in: ids } },
        _count: { _all: true },
      }),
      distinctViaGroups('_GroupMembers', ids),
      distinctViaGroups('_GroupSessions', ids),
    ]);

  const apply = (
    rows: { instructorId: string; _count: { _all: number } }[],
    key: keyof InstructorStats
  ) => {
    for (const r of rows) {
      const stats = result.get(r.instructorId);
      if (stats) stats[key] = r._count._all;
    }
  };
  apply(groups, 'groups');
  apply(exams, 'exams');
  apply(banks, 'banks');
  apply(handouts, 'handouts');
  for (const r of students) {
    const stats = result.get(r.instructorId);
    if (stats) stats.students = r.count;
  }
  for (const r of lessons) {
    const stats = result.get(r.instructorId);
    if (stats) stats.lessons = r.count;
  }
  return result;
}

// اشتراک فعلی چند مدرس با یک کوئری؛ مدرس بدون ردیف «رایگان» حساب می‌شود
// (بدون ساختن ردیف در دیتابیس و بدون اعلان انقضا - خواندنِ ادمین اثر جانبی ندارد)
export async function loadCurrentPlans(ids: string[]) {
  const map = new Map<
    string,
    { planId: string; startDate: Date | null; endDate: Date | null }
  >();
  if (ids.length === 0) return map;
  const latest = await prisma.subscription.findMany({
    where: { instructorId: { in: ids } },
    orderBy: [{ instructorId: 'asc' }, { startDate: 'desc' }],
    distinct: ['instructorId'],
  });
  for (const s of latest) {
    map.set(s.instructorId, {
      planId: s.planId,
      startDate: s.startDate,
      endDate: s.endDate,
    });
  }
  for (const id of ids) {
    if (!map.has(id)) {
      map.set(id, { planId: 'free', startDate: null, endDate: null });
    }
  }
  return map;
}