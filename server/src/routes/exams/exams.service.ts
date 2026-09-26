import { prisma } from '../../lib/prisma';
import { forbidden, badRequest } from '../../lib/errors';
import type { Role } from '../../lib/jwt';
import type { AccessibleExam } from '../../lib/examAccess';

// شکل خروجی دقیقاً همون Exam ـه که client/src/api/examApi.ts انتظارش رو
// داره - status/participants هم اینجا محاسبه می‌شن (طبق تصمیم معماریِ
// schema.prisma: این دو تا ذخیره نمی‌شن، derived ان)
export function serializeExam(exam: AccessibleExam) {
  const now = Date.now();
  const status: 'draft' | 'completed' | 'upcoming' =
    exam.status === 'Draft'
      ? 'draft'
      : exam.scheduledAt.getTime() + exam.durationMinutes * 60_000 <= now
      ? 'completed'
      : 'upcoming';

  return {
    id: exam.id,
    title: exam.title,
    category: exam.category,
    groupIds: exam.groups.map((g) => g.id),
    date: exam.scheduledAt.toISOString(),
    participants: exam._count.attempts,
    status,
    durationMinutes: exam.durationMinutes,
    allowReview: exam.allowReview,
  };
}

// یه Instructor نباید بتونه آزمون رو به گروهی که مال خودش نیست وصل کنه
// (نه موقع ساخت، نه موقع ویرایش) - SuperAdmin از این چک معافه. اگه
// groupIds خالی باشه، چیزی برای چک کردن نیست
export async function assertOwnsAllGroups(
  groupIds: string[],
  role: Role,
  userId: string
): Promise<void> {
  if (role === 'SuperAdmin' || groupIds.length === 0) return;

  const owned = await prisma.group.count({
    where: { id: { in: groupIds }, instructorId: userId },
  });
  if (owned !== groupIds.length) {
    throw forbidden('نمی‌تونی آزمون رو به گروهی که مال تو نیست وصل کنی');
  }
}

// کمی تلورانس برای اختلاف ساعتِ مرورگر و سرور، تا «همین الان» رد نشه
export const PAST_SCHEDULE_TOLERANCE_MS = 5 * 60_000;

export function assertNotInPast(scheduledAt: Date) {
  if (scheduledAt.getTime() < Date.now() - PAST_SCHEDULE_TOLERANCE_MS) {
    throw badRequest('زمان برگزاری آزمون نمی‌تونه گذشته باشه');
  }
}