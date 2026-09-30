"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.examInclude = void 0;
exports.loadAccessibleExam = loadAccessibleExam;
exports.isStudentInExamGroups = isStudentInExamGroups;
const prisma_1 = require("./prisma");
exports.examInclude = {
    groups: { select: { id: true } },
    _count: { select: { attempts: true } },
};
async function loadAccessibleExam(examId, userId, role) {
    const exam = await prisma_1.prisma.exam.findUnique({
        where: { id: examId },
        include: exports.examInclude,
    });
    if (!exam)
        return { exam: null, allowed: false };
    if (role === 'SuperAdmin')
        return { exam, allowed: true };
    const groupIds = exam.groups.map((g) => g.id);
    if (role === 'Instructor') {
        return { exam, allowed: exam.instructorId === userId };
    }
    if (exam.status !== 'Published')
        return { exam, allowed: false };
    const isMember = await prisma_1.prisma.group.count({
        where: { id: { in: groupIds }, students: { some: { id: userId } } },
    });
    if (isMember > 0)
        return { exam, allowed: true };
    const hasAttempt = await prisma_1.prisma.examAttempt.count({
        where: { examId: exam.id, studentId: userId },
    });
    return { exam, allowed: hasAttempt > 0 };
}
// چک عضویتِ دانشجو تو گروه‌های *فعلیِ* آزمون، روی هر client (prisma یا tx).
// برای استفاده بعد از قفل آزمون تو تراکنش: چون تغییر گروه‌ها FOR UPDATE
// می‌گیره، بعد از FOR SHARE این نتیجه کهنه نمی‌شه
async function isStudentInExamGroups(db, examId, studentId) {
    const count = await db.group.count({
        where: {
            exams: { some: { id: examId } },
            students: { some: { id: studentId } },
        },
    });
    return count > 0;
}
