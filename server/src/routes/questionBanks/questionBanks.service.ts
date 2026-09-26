import { prisma } from '../../lib/prisma';

export function serializeBank(bank: {
  id: string;
  name: string;
  category: string;
  instructorId: string;
  _count?: { questions: number };
}) {
  return {
    id: bank.id,
    name: bank.name,
    category: bank.category,
    instructorId: bank.instructorId,
    questionCount: bank._count?.questions ?? 0,
  };
}

export function serializeQuestion(q: {
  id: string;
  bankId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}) {
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
export async function loadOwnedBank(
  bankId: string,
  userId: string,
  role: string
) {
  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) return { bank: null, allowed: false };
  if (role === 'SuperAdmin') return { bank, allowed: true };
  return { bank, allowed: bank.instructorId === userId };
}

// دسترسی به تک‌تک سوال‌ها همیشه از طریق بانکِ والدشه (نه مستقیم از روی
// questionId)، تا هیچ‌وقت نشه با حدس‌زدن یه id سوالِ یه بانکِ دیگه رو
// ویرایش/حذف کرد
export async function loadOwnedQuestion(
  bankId: string,
  questionId: string,
  userId: string,
  role: string
) {
  const { bank, allowed } = await loadOwnedBank(bankId, userId, role);
  if (!bank || !allowed) return { bank, allowed, question: null };

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question || question.bankId !== bank.id) {
    return { bank, allowed, question: null };
  }
  return { bank, allowed, question };
}