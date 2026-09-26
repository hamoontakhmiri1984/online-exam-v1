import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getPlan, type PlanId } from './plans';
import { getCurrentSubscription, isSubscriptionExpired } from './subscriptions';
import { lockInstructorForUpdate } from './instructorLock';
import { AppError } from './errors';

export type QuotaDb = Prisma.TransactionClient;

export type UsageSummary = {
  groups: number;
  activeExams: number;
  questions: number;
  handouts: number;
};

export async function getInstructorUsage(
  instructorId: string,
  db: QuotaDb = prisma
): Promise<UsageSummary> {
  const groups = await db.group.findMany({
    where: { instructorId },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);


  const questionsPromise = (async () => {
    const [bankCount, localExamQuestionCount] = await Promise.all([
      db.question.count({ where: { bank: { instructorId } } }),
      db.examQuestion.count({
        where: {
          questionId: null,
          exam: { instructorId },          // ← قبلاً: exam: { groups: { some: { instructorId } } }
        },
      }),
    ]);
    return bankCount + localExamQuestionCount;
  })();

  const handoutsPromise = db.handout.count({ where: { instructorId } });


  const examsPromise = db.exam.findMany({
    where: { instructorId },
    select: { scheduledAt: true, durationMinutes: true },
  });

  const [exams, questions, handouts] = await Promise.all([
    examsPromise,
    questionsPromise,
    handoutsPromise,
  ]);

  const now = Date.now();
  const activeExams = exams.filter(
    (e) => e.scheduledAt.getTime() + e.durationMinutes * 60_000 > now
  ).length;

  return {
    groups: groupIds.length,
    activeExams,
    questions,
    handouts,
  };
}

export type LimitCheck =
  | { allowed: true }
  | { allowed: false; reason: 'plan_expired' | 'limit_reached' };

export type RemainingQuota =
  | { limited: false }
  | {
      limited: true;
      expired: boolean;
      limit: number;
      used: number;
      remaining: number;
    };

async function getRemainingQuota(
  instructorId: string,
  getLimit: (planId: PlanId) => number | null,
  getUsed: (usage: UsageSummary) => number
): Promise<RemainingQuota> {
  const sub = await getCurrentSubscription(instructorId);
  const limit = getLimit(sub.planId);
  const expired = isSubscriptionExpired(sub);

  if (limit === null && !expired) return { limited: false };

  const usage = await getInstructorUsage(instructorId);
  const used = getUsed(usage);
  const effectiveLimit = limit ?? 0;

  return {
    limited: true,
    expired,
    limit: effectiveLimit,
    used,
    remaining: expired ? 0 : Math.max(0, effectiveLimit - used),
  };
}

async function checkLimit(
  instructorId: string,
  getLimit: (planId: PlanId) => number | null,
  getUsed: (usage: UsageSummary) => number
): Promise<LimitCheck> {
  const quota = await getRemainingQuota(instructorId, getLimit, getUsed);
  if (!quota.limited) return { allowed: true };
  if (quota.expired) return { allowed: false, reason: 'plan_expired' };
  return quota.remaining > 0
    ? { allowed: true }
    : { allowed: false, reason: 'limit_reached' };
}


async function checkLimitForCount(
  instructorId: string,
  count: number,
  getLimit: (planId: PlanId) => number | null,
  getUsed: (usage: UsageSummary) => number
): Promise<LimitCheck> {
  const quota = await getRemainingQuota(instructorId, getLimit, getUsed);
  if (!quota.limited) return { allowed: true };
  if (quota.expired) return { allowed: false, reason: 'plan_expired' };
  return quota.remaining >= count
    ? { allowed: true }
    : { allowed: false, reason: 'limit_reached' };
}


export type QuotaKind = 'groups' | 'activeExams' | 'questions' | 'handouts';

const QUOTA_LIMIT: Record<QuotaKind, (planId: PlanId) => number | null> = {
  groups: (p) => getPlan(p).maxGroups,
  activeExams: (p) => getPlan(p).maxActiveExams,
  questions: (p) => getPlan(p).maxQuestions,
  handouts: (p) => getPlan(p).maxHandouts,
};

const QUOTA_USED: Record<QuotaKind, (usage: UsageSummary) => number> = {
  groups: (u) => u.groups,
  activeExams: (u) => u.activeExams,
  questions: (u) => u.questions,
  handouts: (u) => u.handouts,
};

export type QuotaPlan = { limit: number | null; expired: boolean };

async function resolveQuotaPlan(
  instructorId: string,
  kind: QuotaKind
): Promise<QuotaPlan> {
  const sub = await getCurrentSubscription(instructorId);
  return {
    limit: QUOTA_LIMIT[kind](sub.planId),
    expired: isSubscriptionExpired(sub),
  };
}

function planLimitError(reason: 'plan_expired' | 'limit_reached') {
  return new AppError(403, 'محدودیت پلن', { reason });
}

async function enforceQuotaInTx(
  tx: QuotaDb,
  instructorId: string,
  kind: QuotaKind,
  count: number,
  plan: QuotaPlan
): Promise<void> {
  if (plan.expired) throw planLimitError('plan_expired');
  if (plan.limit === null) return;

  await lockInstructorForUpdate(tx, instructorId);
  const used = QUOTA_USED[kind](await getInstructorUsage(instructorId, tx));
  if (plan.limit - used < count) throw planLimitError('limit_reached');
}


export async function prepareQuotaGuard(
  instructorId: string,
  kind: QuotaKind,
  count = 1
): Promise<(tx: QuotaDb) => Promise<void>> {
  const plan = await resolveQuotaPlan(instructorId, kind);
  return (tx) => enforceQuotaInTx(tx, instructorId, kind, count, plan);
}

const QUOTA_TX_TIMEOUT_MS = 15_000;

export async function withQuotaLock<T>(
  instructorId: string,
  kind: QuotaKind,
  count: number,
  run: (db: QuotaDb) => Promise<T>,
  opts: { timeoutMs?: number } = {}
): Promise<T> {
  const plan = await resolveQuotaPlan(instructorId, kind);
  if (plan.expired) throw planLimitError('plan_expired');
  if (plan.limit === null) return run(prisma);

  return prisma.$transaction(
    async (tx) => {
      await enforceQuotaInTx(tx, instructorId, kind, count, plan);
      return run(tx);
    },
    { timeout: opts.timeoutMs ?? QUOTA_TX_TIMEOUT_MS }
  );
}


export async function withQuotaForRole<T>(
  role: string,
  instructorId: string,
  kind: QuotaKind,
  count: number,
  run: (db: QuotaDb) => Promise<T>,
  opts: { timeoutMs?: number } = {}
): Promise<T> {
  if (role === 'Instructor') {
    return withQuotaLock(instructorId, kind, count, run, opts);
  }
  return prisma.$transaction((tx) => run(tx), {
    timeout: opts.timeoutMs ?? QUOTA_TX_TIMEOUT_MS,
  });
}

export const quotaCheckers = {
  groups: (instructorId: string) =>
    checkLimit(
      instructorId,
      (p) => getPlan(p).maxGroups,
      (u) => u.groups
    ),
  activeExams: (instructorId: string) =>
    checkLimit(
      instructorId,
      (p) => getPlan(p).maxActiveExams,
      (u) => u.activeExams
    ),
  questions: (instructorId: string, count = 1) =>
    checkLimitForCount(
      instructorId,
      count,
      (p) => getPlan(p).maxQuestions,
      (u) => u.questions
    ),
  handouts: (instructorId: string, count = 1) =>
    checkLimitForCount(
      instructorId,
      count,
      (p) => getPlan(p).maxHandouts,
      (u) => u.handouts
    ),
};

export const remainingQuota = {
  groups: (instructorId: string) =>
    getRemainingQuota(
      instructorId,
      (p) => getPlan(p).maxGroups,
      (u) => u.groups
    ),
  activeExams: (instructorId: string) =>
    getRemainingQuota(
      instructorId,
      (p) => getPlan(p).maxActiveExams,
      (u) => u.activeExams
    ),
  questions: (instructorId: string) =>
    getRemainingQuota(
      instructorId,
      (p) => getPlan(p).maxQuestions,
      (u) => u.questions
    ),
  handouts: (instructorId: string) =>
    getRemainingQuota(
      instructorId,
      (p) => getPlan(p).maxHandouts,
      (u) => u.handouts
    ),
};
