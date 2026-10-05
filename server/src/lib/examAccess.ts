import { prisma } from './prisma';
import type { Role } from './jwt';
import type { Prisma } from '@prisma/client';

export const examInclude = {
  groups: { select: { id: true } },
  _count: { select: { attempts: true } },
} as const;

export type AccessibleExam = {
  id: string;
  title: string;
  category: string;
  scheduledAt: Date;
  durationMinutes: number;
  allowReview: boolean;
  status: 'Draft' | 'Published';
  instructorId: string;          
  groups: { id: string }[];
  _count: { attempts: number };
};

export async function loadAccessibleExam(
  examId: string,
  userId: string,
  role: Role
): Promise<{ exam: AccessibleExam | null; allowed: boolean }> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: examInclude,
  });
  if (!exam) return { exam: null, allowed: false };

  if (role === 'SuperAdmin') return { exam, allowed: true };

  const groupIds = exam.groups.map((g) => g.id);

  if (role === 'Instructor') {
    return { exam, allowed: exam.instructorId === userId };
  }

  if (exam.status !== 'Published') return { exam, allowed: false };

  const isMember = await prisma.group.count({
    where: { id: { in: groupIds }, approvalStatus: 'Approved', students: { some: { id: userId } } },
  });
  if (isMember > 0) return { exam, allowed: true };

  const hasAttempt = await prisma.examAttempt.count({
    where: { examId: exam.id, studentId: userId },
  });
  return { exam, allowed: hasAttempt > 0 };
}

// چک عضویتِ دانشجو تو گروه‌های *فعلیِ* آزمون، روی هر client (prisma یا tx).
// برای استفاده بعد از قفل آزمون تو تراکنش: چون تغییر گروه‌ها FOR UPDATE
// می‌گیره، بعد از FOR SHARE این نتیجه کهنه نمی‌شه
export async function isStudentInExamGroups(
  db: Prisma.TransactionClient,
  examId: string,
  studentId: string
): Promise<boolean> {
  const count = await db.group.count({
    where: {
      approvalStatus: 'Approved',
      exams: { some: { id: examId } },
      students: { some: { id: studentId } },
    },
  });
  return count > 0;
}