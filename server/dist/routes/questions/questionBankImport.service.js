"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importBankQuestionsToExam = importBankQuestionsToExam;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const examQuestions_service_1 = require("./examQuestions.service");
// ownerId: وقتی مقدار داره (Instructor)، فقط سوال‌های بانک‌های خودِ همین مدرس
// قابل‌ایمپورتن؛ SuperAdmin ownerId نمی‌ده. قبلاً هر سوالی با هر id ای (حتی از
// بانکِ مدرس دیگه، همراه با جواب صحیح) قابل کپی به آزمون خودت بود. سوالِ
// متعلق به دیگری دقیقاً مثل سوالِ ناموجود notFound می‌ده تا وجودش لو نره.
async function importBankQuestionsToExam(examId, questionIds, ownerId) {
    const questions = (await prisma_1.prisma.question.findMany({
        where: {
            id: {
                in: questionIds,
            },
            ...(ownerId ? { bank: { instructorId: ownerId } } : {}),
        },
    }));
    if (questions.length !== questionIds.length) {
        throw (0, errors_1.notFound)('یک یا چند سوال بانک پیدا نشد');
    }
    const questionMap = new Map(questions.map((question) => [question.id, question]));
    const orderedQuestions = questionIds.map((id) => {
        const question = questionMap.get(id);
        if (!question) {
            throw (0, errors_1.notFound)('سوال بانک پیدا نشد');
        }
        return question;
    });
    return (0, examQuestions_service_1.withNextOrder)(examId, async (tx, startOrder) => {
        const created = [];
        for (const [index, question] of orderedQuestions.entries()) {
            created.push(await tx.examQuestion.create({
                data: {
                    examId,
                    questionId: question.id,
                    order: startOrder + index,
                    textSnapshot: question.text,
                    optionsSnapshot: question.options,
                    correctIndexSnapshot: question.correctOptionIndex,
                },
            }));
        }
        return created;
    });
}
