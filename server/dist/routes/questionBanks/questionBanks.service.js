"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeBank = serializeBank;
exports.serializeQuestion = serializeQuestion;
exports.loadOwnedBank = loadOwnedBank;
exports.loadOwnedQuestion = loadOwnedQuestion;
const prisma_1 = require("../../lib/prisma");
function serializeBank(bank) {
    return {
        id: bank.id,
        name: bank.name,
        category: bank.category,
        instructorId: bank.instructorId,
        questionCount: bank._count?.questions ?? 0,
    };
}
function serializeQuestion(q) {
    return {
        id: q.id,
        bankId: q.bankId,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        difficulty: q.difficulty,
    };
}
// Instructor فقط بانک‌های خودش رو می‌بینه/مدیریت می‌کنه؛ SuperAdmin به همه
// دسترسی داره (دقیقاً هم‌الگوی groups.ts/exams.ts)
async function loadOwnedBank(bankId, userId, role) {
    const bank = await prisma_1.prisma.questionBank.findUnique({ where: { id: bankId } });
    if (!bank)
        return { bank: null, allowed: false };
    if (role === 'SuperAdmin')
        return { bank, allowed: true };
    return { bank, allowed: bank.instructorId === userId };
}
// دسترسی به تک‌تک سوال‌ها همیشه از طریق بانکِ والدشه (نه مستقیم از روی
// questionId)، تا هیچ‌وقت نشه با حدس‌زدن یه id سوالِ یه بانکِ دیگه رو
// ویرایش/حذف کرد
async function loadOwnedQuestion(bankId, questionId, userId, role) {
    const { bank, allowed } = await loadOwnedBank(bankId, userId, role);
    if (!bank || !allowed)
        return { bank, allowed, question: null };
    const question = await prisma_1.prisma.question.findUnique({
        where: { id: questionId },
    });
    if (!question || question.bankId !== bank.id) {
        return { bank, allowed, question: null };
    }
    return { bank, allowed, question };
}
