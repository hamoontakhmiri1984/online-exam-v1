import { recordAdminAction } from './adminAudit';
import { prisma } from './prisma';
import { PLAN_ORDER, getPlan, type PlanId } from './plans';
import { badRequest } from './errors';
import { notifyUser } from './notifications';
import { lockInstructorForUpdate } from './instructorLock';

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionRow = {
  id: string;
  instructorId: string;
  planId: PlanId;
  startDate: Date;
  endDate: Date | null;
  expiryNotifiedAt: Date | null;
};

export type SubscriptionSummary = Pick<
  SubscriptionRow,
  'instructorId' | 'planId' | 'startDate' | 'endDate'
>;

export function computeEndDate(planId: PlanId, from: Date): Date | null {
  const plan = getPlan(planId);
  if (plan.durationDays === null) return null;
  return new Date(from.getTime() + plan.durationDays * DAY_MS);
}

// Renewals extend an unexpired matching plan from its current end date.
export function computePurchaseEndDate(
  planId: PlanId,
  current: { planId: PlanId; endDate: Date | null } | null,
  now: Date
): Date | null {
  const canExtend =
    current !== null &&
    current.planId === planId &&
    current.endDate !== null &&
    current.endDate.getTime() > now.getTime();
  return computeEndDate(planId, canExtend ? current!.endDate! : now);
}

export function serializeSubscription(s: SubscriptionSummary) {
  return {
    instructorId: s.instructorId,
    planId: s.planId,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate ? s.endDate.toISOString() : null,
  };
}

// Claim the expiry notification atomically to prevent duplicate delivery.
async function notifyIfNewlyExpired(sub: SubscriptionRow): Promise<void> {
  if (!sub.endDate || sub.endDate.getTime() >= Date.now()) return;
  if (sub.expiryNotifiedAt) return;

  const { count } = await prisma.subscription.updateMany({
    where: { id: sub.id, expiryNotifiedAt: null },
    data: { expiryNotifiedAt: new Date() },
  });
  if (count === 0) return;

  await notifyUser(
    sub.instructorId,
    `پلن «${sub.planId}» شما منقضی شد - برای ادامه‌ی استفاده تمدید کنید`,
    'info'
  );
}

// The newest subscription is current; changes append history rather than overwriting it.
export async function getCurrentSubscription(
  instructorId: string
): Promise<SubscriptionRow> {
  const existing = await prisma.subscription.findFirst({
    where: { instructorId },
    orderBy: { startDate: 'desc' },
  });
  if (existing) {
    await notifyIfNewlyExpired(existing);
    return existing;
  }

  // Create the initial free subscription under the instructor lock.
  return prisma.$transaction(async (tx) => {
    await lockInstructorForUpdate(tx, instructorId);

    const created = await tx.subscription.findFirst({
      where: { instructorId },
      orderBy: { startDate: 'desc' },
    });
    if (created) return created;

    return tx.subscription.create({
      data: {
        instructorId,
        planId: 'free',
        startDate: new Date(),
        endDate: null,
      },
    });
  });
}

// Reject downgrades while a paid plan remains active.
export async function assertPlanChangeAllowed(
  instructorId: string,
  targetPlanId: PlanId
): Promise<void> {
  const current = await getCurrentSubscription(instructorId);
  if (getPlan(current.planId).price === 0 || isSubscriptionExpired(current)) {
    return;
  }

  if (PLAN_ORDER.indexOf(targetPlanId) < PLAN_ORDER.indexOf(current.planId)) {
    throw badRequest(
      'تا پایان دوره‌ی پلن فعلی نمی‌تونی به پلن پایین‌تر بری. بعد از پایان دوره می‌تونی تغییر بدی'
    );
  }
}

// Administrative reads must not create subscriptions or send expiry notifications.
export async function listCurrentSubscriptions(): Promise<
  SubscriptionSummary[]
> {
  const [instructors, latest] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'Instructor' },
      select: { id: true },
    }),
    prisma.subscription.findMany({
      where: { instructor: { role: 'Instructor' } },
      orderBy: [{ instructorId: 'asc' }, { startDate: 'desc' }],
      distinct: ['instructorId'],
    }),
  ]);

  const byInstructor = new Map(latest.map((s) => [s.instructorId, s]));
  return instructors.map(
    (i) =>
      byInstructor.get(i.id) ?? {
        instructorId: i.id,
        planId: 'free' as const,
        startDate: new Date(),
        endDate: null,
      }
  );
}

// Append free/manual assignments; paid activation belongs to verified checkout.
export async function selectPlan(
  instructorId: string,
  planId: PlanId,
  adminId?: string
): Promise<SubscriptionRow> {
  const now = new Date();
  if (adminId) {
    return prisma.$transaction(async tx => {
      await lockInstructorForUpdate(tx, instructorId);
      const previous = await tx.subscription.findFirst({ where: { instructorId }, orderBy: [{ startDate: 'desc' }, { id: 'desc' }] });
      const subscription = await tx.subscription.create({ data: { instructorId, planId, startDate: now, endDate: computeEndDate(planId, now) } });
      await recordAdminAction(tx, { adminId, action: 'instructor.plan_change', targetType: 'User', targetId: instructorId, before: { planId: previous?.planId ?? 'free' }, after: { planId, subscriptionId: subscription.id } });
      return subscription;
    });
  }
  return prisma.subscription.create({
    data: {
      instructorId,
      planId,
      startDate: now,
      endDate: computeEndDate(planId, now),
    },
  });
}

export async function renewSubscription(
  instructorId: string
): Promise<SubscriptionRow> {
  const current = await getCurrentSubscription(instructorId);
  return selectPlan(instructorId, current.planId);
}

export async function getSubscriptionHistory(
  instructorId: string
): Promise<SubscriptionRow[]> {
  return prisma.subscription.findMany({
    where: { instructorId },
    orderBy: { startDate: 'desc' },
  });
}

export function isSubscriptionExpired(sub: { endDate: Date | null }): boolean {
  if (!sub.endDate) return false;
  return sub.endDate.getTime() < Date.now();
}

export function getRemainingDays(sub: { endDate: Date | null }): number | null {
  if (!sub.endDate) return null;
  const diff = sub.endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}
