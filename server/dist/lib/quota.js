"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remainingQuota = exports.quotaCheckers = void 0;
exports.getInstructorUsage = getInstructorUsage;
exports.prepareQuotaGuard = prepareQuotaGuard;
exports.withQuotaLock = withQuotaLock;
exports.withQuotaForRole = withQuotaForRole;
const prisma_1 = require("./prisma");
const plans_1 = require("./plans");
const subscriptions_1 = require("./subscriptions");
const instructorLock_1 = require("./instructorLock");
const errors_1 = require("./errors");
async function getInstructorUsage(instructorId, db = prisma_1.prisma) {
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
                    exam: { instructorId }, // ← قبلاً: exam: { groups: { some: { instructorId } } }
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
    const activeExams = exams.filter((e) => e.scheduledAt.getTime() + e.durationMinutes * 60_000 > now).length;
    return {
        groups: groupIds.length,
        activeExams,
        questions,
        handouts,
    };
}
async function getRemainingQuota(instructorId, getLimit, getUsed) {
    const sub = await (0, subscriptions_1.getCurrentSubscription)(instructorId);
    const limit = getLimit(sub.planId);
    const expired = (0, subscriptions_1.isSubscriptionExpired)(sub);
    if (limit === null && !expired)
        return { limited: false };
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
async function checkLimit(instructorId, getLimit, getUsed) {
    const quota = await getRemainingQuota(instructorId, getLimit, getUsed);
    if (!quota.limited)
        return { allowed: true };
    if (quota.expired)
        return { allowed: false, reason: 'plan_expired' };
    return quota.remaining > 0
        ? { allowed: true }
        : { allowed: false, reason: 'limit_reached' };
}
async function checkLimitForCount(instructorId, count, getLimit, getUsed) {
    const quota = await getRemainingQuota(instructorId, getLimit, getUsed);
    if (!quota.limited)
        return { allowed: true };
    if (quota.expired)
        return { allowed: false, reason: 'plan_expired' };
    return quota.remaining >= count
        ? { allowed: true }
        : { allowed: false, reason: 'limit_reached' };
}
const QUOTA_LIMIT = {
    groups: (p) => (0, plans_1.getPlan)(p).maxGroups,
    activeExams: (p) => (0, plans_1.getPlan)(p).maxActiveExams,
    questions: (p) => (0, plans_1.getPlan)(p).maxQuestions,
    handouts: (p) => (0, plans_1.getPlan)(p).maxHandouts,
};
const QUOTA_USED = {
    groups: (u) => u.groups,
    activeExams: (u) => u.activeExams,
    questions: (u) => u.questions,
    handouts: (u) => u.handouts,
};
async function resolveQuotaPlan(instructorId, kind) {
    const sub = await (0, subscriptions_1.getCurrentSubscription)(instructorId);
    return {
        limit: QUOTA_LIMIT[kind](sub.planId),
        expired: (0, subscriptions_1.isSubscriptionExpired)(sub),
    };
}
function planLimitError(reason) {
    return new errors_1.AppError(403, 'محدودیت پلن', { reason });
}
async function enforceQuotaInTx(tx, instructorId, kind, count, plan) {
    if (plan.expired)
        throw planLimitError('plan_expired');
    if (plan.limit === null)
        return;
    await (0, instructorLock_1.lockInstructorForUpdate)(tx, instructorId);
    const used = QUOTA_USED[kind](await getInstructorUsage(instructorId, tx));
    if (plan.limit - used < count)
        throw planLimitError('limit_reached');
}
async function prepareQuotaGuard(instructorId, kind, count = 1) {
    const plan = await resolveQuotaPlan(instructorId, kind);
    return (tx) => enforceQuotaInTx(tx, instructorId, kind, count, plan);
}
const QUOTA_TX_TIMEOUT_MS = 15_000;
async function withQuotaLock(instructorId, kind, count, run, opts = {}) {
    const plan = await resolveQuotaPlan(instructorId, kind);
    if (plan.expired)
        throw planLimitError('plan_expired');
    if (plan.limit === null)
        return run(prisma_1.prisma);
    return prisma_1.prisma.$transaction(async (tx) => {
        await enforceQuotaInTx(tx, instructorId, kind, count, plan);
        return run(tx);
    }, { timeout: opts.timeoutMs ?? QUOTA_TX_TIMEOUT_MS });
}
async function withQuotaForRole(role, instructorId, kind, count, run, opts = {}) {
    if (role === 'Instructor') {
        return withQuotaLock(instructorId, kind, count, run, opts);
    }
    return prisma_1.prisma.$transaction((tx) => run(tx), {
        timeout: opts.timeoutMs ?? QUOTA_TX_TIMEOUT_MS,
    });
}
exports.quotaCheckers = {
    groups: (instructorId) => checkLimit(instructorId, (p) => (0, plans_1.getPlan)(p).maxGroups, (u) => u.groups),
    activeExams: (instructorId) => checkLimit(instructorId, (p) => (0, plans_1.getPlan)(p).maxActiveExams, (u) => u.activeExams),
    questions: (instructorId, count = 1) => checkLimitForCount(instructorId, count, (p) => (0, plans_1.getPlan)(p).maxQuestions, (u) => u.questions),
    handouts: (instructorId, count = 1) => checkLimitForCount(instructorId, count, (p) => (0, plans_1.getPlan)(p).maxHandouts, (u) => u.handouts),
};
exports.remainingQuota = {
    groups: (instructorId) => getRemainingQuota(instructorId, (p) => (0, plans_1.getPlan)(p).maxGroups, (u) => u.groups),
    activeExams: (instructorId) => getRemainingQuota(instructorId, (p) => (0, plans_1.getPlan)(p).maxActiveExams, (u) => u.activeExams),
    questions: (instructorId) => getRemainingQuota(instructorId, (p) => (0, plans_1.getPlan)(p).maxQuestions, (u) => u.questions),
    handouts: (instructorId) => getRemainingQuota(instructorId, (p) => (0, plans_1.getPlan)(p).maxHandouts, (u) => u.handouts),
};
