import { prisma } from '../../lib/prisma';
import { forbidden, badRequest } from '../../lib/errors';
import type { Role } from '../../lib/jwt';
import type { AccessibleExam } from '../../lib/examAccess';
import { examInclude } from '../../lib/examAccess';
import { prepareQuotaGuard } from '../../lib/quota';
import { withExamWriteLock } from '../../lib/examLock';
import { resolveScheduledAt, toMinute } from '../../lib/examTiming';
import type { updateExamSchema } from '../../validation/examSchemas';
import type { z } from 'zod';

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

export async function assertOwnsAllGroups(
  groupIds: string[],
  role: Role,
  userId: string
): Promise<void> {
  if (groupIds.length === 0) return;

  const owned = await prisma.group.count({
    where: { id: { in: groupIds }, approvalStatus: 'Approved', ...(role === 'SuperAdmin' ? {} : { instructorId: userId }) },
  });
  if (owned !== groupIds.length) {
    throw forbidden('نمی‌تونی آزمون رو به گروهی که مال تو نیست وصل کنی');
  }
}

export const PAST_SCHEDULE_TOLERANCE_MS = 5 * 60_000;

export function assertNotInPast(scheduledAt: Date) {
  if (scheduledAt.getTime() < Date.now() - PAST_SCHEDULE_TOLERANCE_MS) {
    throw badRequest('زمان برگزاری آزمون نمی‌تونه گذشته باشه');
  }
}

type UpdateExamData = z.infer<typeof updateExamSchema>;

function computeChangesLockedFields(
  current: { scheduledAt: Date; durationMinutes: number; groups: { id: string }[] },
  newScheduledAt: Date,
  newDurationMinutes: number,
  newGroupIds: Set<string>
): boolean {
  const currentGroupIds = new Set(current.groups.map((g) => g.id));
  const sameGroups =
    currentGroupIds.size === newGroupIds.size &&
    [...newGroupIds].every((id) => currentGroupIds.has(id));
  return (
    toMinute(newScheduledAt) !== toMinute(current.scheduledAt) ||
    newDurationMinutes !== current.durationMinutes ||
    !sameGroups
  );
}

// Once started, timing and groups are immutable to preserve deadlines and access.
function assertScheduleEditable(
  attemptCount: number,
  changesLockedFields: boolean
): void {
  if (attemptCount > 0 && changesLockedFields) {
    throw badRequest(
      'این آزمون قبلاً توسط دانشجو شروع شده - زمان، مدت و گروه‌هاش قابل تغییر نیستن'
    );
  }
}

export async function updateExam(
  examId: string,
  role: Role,
  sub: string,
  existing: AccessibleExam,
  data: UpdateExamData
): Promise<AccessibleExam> {
  await assertOwnsAllGroups(data.groupIds, role, sub);

  // Preserve exact timestamps when the minute-precision form has not changed them.
  const requestedScheduledAt = new Date(data.scheduledAt);
  const newScheduledAt = resolveScheduledAt(
    existing.scheduledAt,
    requestedScheduledAt
  );
  const newGroupIds = new Set(data.groupIds);

  // Validate past dates only when the schedule actually changes.
  if (toMinute(newScheduledAt) !== toMinute(existing.scheduledAt)) {
    assertNotInPast(newScheduledAt);
  }

  assertScheduleEditable(
    existing._count.attempts,
    computeChangesLockedFields(
      existing,
      newScheduledAt,
      data.durationMinutes,
      newGroupIds
    )
  );

  // Reactivating an expired exam must also satisfy the active-exam quota.
  let quotaGuard: Awaited<ReturnType<typeof prepareQuotaGuard>> | undefined;
  if (role === 'Instructor') {
    const now = Date.now();
    const wasActive =
      existing.scheduledAt.getTime() + existing.durationMinutes * 60_000 >
      now;
    const willBeActive =
      newScheduledAt.getTime() + data.durationMinutes * 60_000 > now;
    if (!wasActive && willBeActive) {
      quotaGuard = await prepareQuotaGuard(sub, 'activeExams');
    }
  }

  // Recheck edit eligibility under the same lock used by start.
  return withExamWriteLock(
    examId,
    async (tx, { attemptCount }) => {
      // Read current state after taking the lock.
      const current = await tx.exam.findUniqueOrThrow({
        where: { id: examId },
        select: {
          scheduledAt: true,
          durationMinutes: true,
          groups: { select: { id: true } },
        },
      });
      const scheduledAt = resolveScheduledAt(
        current.scheduledAt,
        requestedScheduledAt
      );
      assertScheduleEditable(
        attemptCount,
        computeChangesLockedFields(
          current,
          scheduledAt,
          data.durationMinutes,
          newGroupIds
        )
      );

      return tx.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          category: data.category,
          scheduledAt,
          durationMinutes: data.durationMinutes,
          allowReview: data.allowReview,
          groups: { set: data.groupIds.map((id) => ({ id })) },
        },
        include: examInclude,
      });
    },
    { beforeExamLock: quotaGuard }
  );
}
