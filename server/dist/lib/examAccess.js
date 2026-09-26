"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.examInclude = void 0;
exports.loadAccessibleExam = loadAccessibleExam;
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
