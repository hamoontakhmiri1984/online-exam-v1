"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertExamQuestionsEditable = assertExamQuestionsEditable;
exports.withNextOrder = withNextOrder;
exports.getExamQuestions = getExamQuestions;
exports.createExamQuestion = createExamQuestion;
exports.createExamQuestionsBulk = createExamQuestionsBulk;
exports.updateExamQuestion = updateExamQuestion;
exports.deleteExamQuestion = deleteExamQuestion;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const examLock_1 = require("../../lib/examLock");
// بعد از اینکه حتی یه دانشجو آزمون رو شروع کرده، سوال‌ها (متن، گزینه، جواب
// صحیح، تعداد) نباید عوض بشن - نمره‌دهیِ finish از همین سوال‌ها حساب می‌شه
// و تغییرشون وسط/بعد از آزمون نمره‌ها رو با هم ناسازگار می‌کنه.
//
// توجه: چک روی exam._count که قبل از تراکنش خونده شده فقط یه fail-fast ارزونه
// (routeها صداش می‌زنن)؛ چک قطعی همین تابع *داخل* withExamWriteLock و با
// تعداد attempt بعد از قفل ردیف آزمون انجام می‌شه (نگاه کن به لایه‌ی سرویس پایین)
function assertExamQuestionsEditable(exam) {
    if (exam._count.attempts > 0) {
        throw (0, errors_1.conflict)('این آزمون قبلاً توسط دانشجو شروع شده - سوال‌هاش قابل تغییر نیستن');
    }
}
// تعداد تلاش مجدد وقتی دو درخواست هم‌زمان همان order را بگیرند (P2002)
const MAX_ORDER_ATTEMPTS = 3;
async function withNextOrder(examId, run, beforeExamLock) {
    for (let attempt = 1;; attempt += 1) {
        try {
            return await (0, examLock_1.withExamWriteLock)(examId, async (tx, { attemptCount }) => {
                assertExamQuestionsEditable({ _count: { attempts: attemptCount } });
                const { _max } = await tx.examQuestion.aggregate({
                    where: { examId },
                    _max: { order: true },
                });
                return run(tx, (_max.order ?? -1) + 1);
            }, { beforeExamLock });
        }
        catch (err) {
            const isOrderConflict = err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002';
            if (isOrderConflict && attempt < MAX_ORDER_ATTEMPTS) {
                continue;
            }
            throw err;
        }
    }
}
async function getExamQuestions(examId) {
    return prisma_1.prisma.examQuestion.findMany({
        where: {
            examId,
        },
        orderBy: {
            order: 'asc',
        },
    });
}
async function createExamQuestion(examId, input, beforeExamLock) {
    return withNextOrder(examId, (tx, order) => tx.examQuestion.create({
        data: {
            examId,
            order,
            textSnapshot: input.text,
            optionsSnapshot: input.options,
            correctIndexSnapshot: input.correctOptionIndex,
        },
    }), beforeExamLock);
}
async function createExamQuestionsBulk(examId, questions, beforeExamLock) {
    return withNextOrder(examId, async (tx, startOrder) => {
        const created = [];
        for (const [index, question] of questions.entries()) {
            created.push(await tx.examQuestion.create({
                data: {
                    examId,
                    order: startOrder + index,
                    textSnapshot: question.text,
                    optionsSnapshot: question.options,
                    correctIndexSnapshot: question.correctOptionIndex,
                },
            }));
        }
        return created;
    }, beforeExamLock);
}
async function updateExamQuestion(examId, questionId, input) {
    return (0, examLock_1.withExamWriteLock)(examId, async (tx, { attemptCount }) => {
        assertExamQuestionsEditable({ _count: { attempts: attemptCount } });
        const question = await tx.examQuestion.findUnique({
            where: {
                id: questionId,
            },
        });
        if (!question || question.examId !== examId) {
            throw (0, errors_1.notFound)('سوال یافت نشد');
        }
        return tx.examQuestion.update({
            where: {
                id: questionId,
            },
            data: {
                textSnapshot: input.text,
                optionsSnapshot: input.options,
                correctIndexSnapshot: input.correctOptionIndex,
            },
        });
    });
}
async function deleteExamQuestion(examId, questionId) {
    await (0, examLock_1.withExamWriteLock)(examId, async (tx, { attemptCount }) => {
        assertExamQuestionsEditable({ _count: { attempts: attemptCount } });
        const question = await tx.examQuestion.findUnique({
            where: {
                id: questionId,
            },
        });
        if (!question || question.examId !== examId) {
            throw (0, errors_1.notFound)('سوال یافت نشد');
        }
        await tx.examQuestion.delete({
            where: {
                id: questionId,
            },
        });
    });
}
