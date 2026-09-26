"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINISH_GRACE_MS = void 0;
exports.sanitizeAnswers = sanitizeAnswers;
exports.finalizeAttempt = finalizeAttempt;
exports.notifyInstructorsAboutFinish = notifyInstructorsAboutFinish;
exports.finalizeExpiredAttempts = finalizeExpiredAttempts;
exports.startAttemptSweeper = startAttemptSweeper;
const prisma_1 = require("./prisma");
const notifications_1 = require("./notifications");
const examTiming_1 = require("./examTiming");
Object.defineProperty(exports, "FINISH_GRACE_MS", { enumerable: true, get: function () { return examTiming_1.FINISH_GRACE_MS; } });
// answers تو دیتابیس Json ـه؛ قبل از نمره‌دادن به یه map سالم تبدیلش می‌کنیم
function sanitizeAnswers(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
            out[key] = value;
        }
    }
    return out;
}
// finalize اتمیک: فقط اولین کسی که finishedAt رو از null عوض کنه برنده‌ست
// (won: true). درخواست/sweep دوم فقط نتیجه‌ی ثبت‌شده رو می‌بینه (won: false)
// و نباید اعلان دوباره بفرسته
async function finalizeAttempt(input) {
    const questions = await prisma_1.prisma.examQuestion.findMany({
        where: { examId: input.examId },
        select: { id: true, correctIndexSnapshot: true },
    });
    const correctCount = questions.filter((q) => input.answers[q.id] === q.correctIndexSnapshot).length;
    const { count } = await prisma_1.prisma.examAttempt.updateMany({
        where: { id: input.attemptId, finishedAt: null },
        data: {
            answers: input.answers,
            correctCount,
            totalQuestions: questions.length,
            finishedAt: input.finishedAt,
            endedByTimeout: input.endedByTimeout,
        },
    });
    const attempt = await prisma_1.prisma.examAttempt.findUniqueOrThrow({
        where: { id: input.attemptId },
    });
    return { won: count === 1, attempt };
}
async function notifyInstructorsAboutFinish(attempt) {
    const [student, exam] = await Promise.all([
        prisma_1.prisma.user.findUnique({
            where: { id: attempt.studentId },
            select: { name: true },
        }),
        prisma_1.prisma.exam.findUnique({
            where: { id: attempt.examId },
            select: { title: true, groups: { select: { instructorId: true } } },
        }),
    ]);
    if (!exam)
        return;
    const instructorIds = [...new Set(exam.groups.map((g) => g.instructorId))];
    const studentName = student?.name ?? 'یه دانشجو';
    await Promise.all(instructorIds.map((instructorId) => (0, notifications_1.notifyUser)(instructorId, `${studentName} آزمون «${exam.title}» رو با نمره‌ی ${attempt.correctCount} از ${attempt.totalQuestions} تموم کرد`, 'award')));
}
// attempt‌هایی که وقتشون تموم شده (+ مهلت) ولی هیچ‌وقت finish نشدن (قطعی
// نت/بستن مرورگر) با جواب‌های autosave‌شده بسته می‌شن
async function finalizeExpiredAttempts(opts = {}) {
    const stale = await prisma_1.prisma.examAttempt.findMany({
        where: {
            finishedAt: null,
            expiresAt: { lt: new Date(Date.now() - examTiming_1.FINISH_GRACE_MS) },
            ...(opts.examId ? { examId: opts.examId } : {}),
            ...(opts.studentId ? { studentId: opts.studentId } : {}),
        },
        take: opts.limit ?? 200,
    });
    let finalized = 0;
    for (const a of stale) {
        const { won, attempt } = await finalizeAttempt({
            attemptId: a.id,
            examId: a.examId,
            answers: sanitizeAnswers(a.answers),
            finishedAt: a.expiresAt,
            endedByTimeout: true,
        });
        if (!won)
            continue;
        finalized++;
        await notifyInstructorsAboutFinish(attempt).catch((err) => console.error('notifyInstructorsAboutFinish failed:', err));
    }
    return finalized;
}
// sweep دوره‌ای برای attempt‌های رهاشده - چند instance هم‌زمان اجرا بشن مشکلی
// نیست چون finalizeAttempt اتمیکه
function startAttemptSweeper(intervalMs = 60_000) {
    const timer = setInterval(() => {
        finalizeExpiredAttempts().catch((err) => console.error('finalizeExpiredAttempts failed:', err));
    }, intervalMs);
    timer.unref();
    return timer;
}
