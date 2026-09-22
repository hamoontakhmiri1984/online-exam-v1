import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getPlan, type PlanId } from './plans';
import { getCurrentSubscription, isSubscriptionExpired } from './subscriptions';
import { lockInstructorForUpdate } from './instructorLock';
import { AppError } from './errors';

// کلاینتِ کوئری: یا تراکنش، یا خودِ prisma (PrismaClient با این نوع سازگاره)
export type QuotaDb = Prisma.TransactionClient;

export type UsageSummary = {
  groups: number;
  activeExams: number;
  questions: number;
  handouts: number;
};

// دقیقاً معادل getInstructorUsage تو mock: تعداد گروه‌های خودِ مدرس، تعداد
// آزمون‌های «upcoming» (هنوز تموم نشده) روی اون گروه‌ها، و مجموع سوال‌ها.
export async function getInstructorUsage(
  instructorId: string,
  db: QuotaDb = prisma
): Promise<UsageSummary> {
  const groups = await db.group.findMany({
    where: { instructorId },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);

  // سقف پلن رو مجموعِ (سوال‌های بانک) + (سوال‌هایی که مستقیم تو یه آزمون
  // نوشته شدن، نه از بانک ایمپورت - questionId: null) حساب می‌کنیم. سوالی
  // که از بانک به چند آزمون ایمپورت می‌شه دوباره شمرده نمی‌شه (همون یه
  // سوال بانکه)، ولی نوشتنِ مستقیمِ سوال تو آزمون (که تا الان قسر در
  // می‌رفت و سهمیه رو دور می‌زد) الان حساب می‌شه
  const questionsPromise = (async () => {
    const [bankCount, localExamQuestionCount] = await Promise.all([
      db.question.count({ where: { bank: { instructorId } } }),
      db.examQuestion.count({
        where: {
          questionId: null,
          exam: { groups: { some: { instructorId } } },
        },
      }),
    ]);
    return bankCount + localExamQuestionCount;
  })();

  // جزوه‌های خودِ مدرس، چه به یه گروه خاص وصل باشن چه فقط به دسته - همه‌شون
  // رو خود مدرس می‌سازه، پس سقف پلن روی instructorId حساب می‌شه (نه گروه)
  const handoutsPromise = db.handout.count({ where: { instructorId } });

  if (groupIds.length === 0) {
    return {
      groups: 0,
      activeExams: 0,
      questions: await questionsPromise,
      handouts: await handoutsPromise,
    };
  }

  const exams = await db.exam.findMany({
    where: { groups: { some: { id: { in: groupIds } } } },
    select: { scheduledAt: true, durationMinutes: true },
  });

  const now = Date.now();
  const activeExams = exams.filter(
    (e) => e.scheduledAt.getTime() + e.durationMinutes * 60_000 > now
  ).length;

  return {
    groups: groupIds.length,
    activeExams,
    questions: await questionsPromise,
    handouts: await handoutsPromise,
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

  // limit === null یعنی «نامحدود»، ولی فقط تا وقتی که پلن منقضی نشده.
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

// چک محدودیت با تعداد آیتم قابل‌درخواست (برای ایمپورت دسته‌ای سوال) - اگه
// remaining کمتر از count باشه یعنی این دسته کامل جا نمی‌شه
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

// ---------------------------------------------------------------------------
// اعمالِ اتمیکِ سهمیه (چک + ساخت داخل یه تراکنش، پشت قفلِ مدرس)
// ---------------------------------------------------------------------------
//
// quotaCheckers/remainingQuota پایین‌تر فقط «مشورتی»ان (نمایش نوار پیشرفت،
// خطای زودهنگام): چک جدا از ساخت انجام می‌شن، پس چند درخواستِ موازی همه‌شون
// می‌تونن چکِ «جا هست» رو رد کنن و از سقف پلن بگذرن. هر مسیری که ردیفِ
// سهمیه‌دار می‌سازه باید از withQuotaLock (یا prepareQuotaGuard + قفل خودش)
// رد بشه:
//   ۱) پلنِ مدرس *قبل از تراکنش* خونده می‌شه (getCurrentSubscription ممکنه
//      خودش بنویسه/اعلان بفرسته و کانکشن دوم بخواد - داخل تراکنش نمی‌ذاریمش
//      تا با کانکشنِ نگه‌داشته‌شده pool رو قفل نکنه)
//   ۲) داخل تراکنش: قفلِ ردیف مدرس، شمارشِ مصرف با همون tx، مقایسه با سقف
//   ۳) ساختنِ ردیف با همون tx - قبل از آزاد شدن قفل commit می‌شه، پس
//      درخواستِ بعدیِ همون مدرس مصرفِ به‌روز رو می‌بینه
// پلن نامحدود (و منقضی‌نشده) هیچ قفلی نمی‌گیره.

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

// برای مسیرهایی که تراکنشِ خودشون رو دارن (مثل withExamWriteLock): بعد از
// صدا زدنِ این تابع، چکِ سهمیه رو باید *اول‌ترین کارِ تراکنش* صدا بزنن (قبل از
// قفل ردیف آزمون؛ ترتیبِ قفل‌ها همه‌جا «مدرس ← آزمون» ـه)
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

// نسخه‌ی نقش‌دار: SuperAdmin از سهمیه معافه ولی ساخت همچنان داخل یه
// تراکنشِ اتمیک اجرا می‌شه (ایمپورت دسته‌ای نباید نیمه‌کاره بمونه)
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
