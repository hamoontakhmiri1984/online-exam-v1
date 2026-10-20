import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, forbidden, notFound } from '../../lib/errors';
import { withExamWriteLock } from '../../lib/examLock';
import { loadAccessibleExam, type AccessibleExam } from '../../lib/examAccess';
import type { Role } from '../../lib/jwt';

export type ExamQuestionRecord = {
  id: string;
  examId: string;
  questionId: string | null;
  order: number;
  textSnapshot: string;
  optionsSnapshot: string[];
  correctIndexSnapshot: number;
};

export type ExamQuestionInput = {
  text: string;
  options: string[];
  correctOptionIndex: number;
};

export async function loadExamOrThrow(
  examId: string,
  userId: string,
  role: Role
): Promise<AccessibleExam> {
  const { exam, allowed } = await loadAccessibleExam(examId, userId, role);
  if (!exam) throw notFound('آزمون یافت نشد');
  if (!allowed) throw forbidden();
  return exam;
}

export function serializeExamQuestion(question: ExamQuestionRecord) {
  return {
    id: question.id,
    examId: question.examId,
    questionId: question.questionId,
    text: question.textSnapshot,
    options: question.optionsSnapshot,
    correctOptionIndex: question.correctIndexSnapshot,
  };
}

// Questions become immutable once an attempt starts because grading uses these records.
export function assertExamQuestionsEditable(exam: {
  _count: { attempts: number };
}): void {
  if (exam._count.attempts > 0) {
    throw conflict(
      'این آزمون قبلاً توسط دانشجو شروع شده - سوال‌هاش قابل تغییر نیستن'
    );
  }
}

const MAX_ORDER_ATTEMPTS = 3;

// Use max(order) + 1; count would collide after deleting a middle question.
export type BeforeExamLock = (tx: Prisma.TransactionClient) => Promise<void>;

export async function withNextOrder<T>(
  examId: string,
  run: (tx: Prisma.TransactionClient, startOrder: number) => Promise<T>,
  beforeExamLock?: BeforeExamLock
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await withExamWriteLock(
        examId,
        async (tx, { attemptCount }) => {
          assertExamQuestionsEditable({ _count: { attempts: attemptCount } });

          const { _max } = await tx.examQuestion.aggregate({
            where: { examId },
            _max: { order: true },
          });

          return run(tx, (_max.order ?? -1) + 1);
        },
        { beforeExamLock }
      );
    } catch (err) {
      const isOrderConflict =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002';

      if (isOrderConflict && attempt < MAX_ORDER_ATTEMPTS) {
        continue;
      }

      throw err;
    }
  }
}

export async function getExamQuestions(
  examId: string
): Promise<ExamQuestionRecord[]> {
  return prisma.examQuestion.findMany({
    where: {
      examId,
    },
    orderBy: {
      order: 'asc',
    },
  });
}

export async function createExamQuestion(
  examId: string,
  input: ExamQuestionInput,
  beforeExamLock?: BeforeExamLock
): Promise<ExamQuestionRecord> {
  return withNextOrder(
    examId,
    (tx, order) =>
      tx.examQuestion.create({
        data: {
          examId,
          order,
          textSnapshot: input.text,
          optionsSnapshot: input.options,
          correctIndexSnapshot: input.correctOptionIndex,
        },
      }),
    beforeExamLock
  );
}

export async function createExamQuestionsBulk(
  examId: string,
  questions: ExamQuestionInput[],
  beforeExamLock?: BeforeExamLock
): Promise<ExamQuestionRecord[]> {
  return withNextOrder(
    examId,
    async (tx, startOrder) => {
      const created: ExamQuestionRecord[] = [];

      for (const [index, question] of questions.entries()) {
        created.push(
          await tx.examQuestion.create({
            data: {
              examId,
              order: startOrder + index,
              textSnapshot: question.text,
              optionsSnapshot: question.options,
              correctIndexSnapshot: question.correctOptionIndex,
            },
          })
        );
      }

      return created;
    },
    beforeExamLock
  );
}

export async function updateExamQuestion(
  examId: string,
  questionId: string,
  input: ExamQuestionInput
): Promise<ExamQuestionRecord> {
  return withExamWriteLock(examId, async (tx, { attemptCount }) => {
    assertExamQuestionsEditable({ _count: { attempts: attemptCount } });

    const question = await tx.examQuestion.findUnique({
      where: {
        id: questionId,
      },
    });

    if (!question || question.examId !== examId) {
      throw notFound('سوال یافت نشد');
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

export async function deleteExamQuestion(
  examId: string,
  questionId: string
): Promise<void> {
  await withExamWriteLock(examId, async (tx, { attemptCount }) => {
    assertExamQuestionsEditable({ _count: { attempts: attemptCount } });

    const question = await tx.examQuestion.findUnique({
      where: {
        id: questionId,
      },
    });

    if (!question || question.examId !== examId) {
      throw notFound('سوال یافت نشد');
    }

    await tx.examQuestion.delete({
      where: {
        id: questionId,
      },
    });
  });
}
