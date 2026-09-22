import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound } from '../../lib/errors';
import { withExamWriteLock } from '../../lib/examLock';

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

// بعد از اینکه حتی یه دانشجو آزمون رو شروع کرده، سوال‌ها (متن، گزینه، جواب
// صحیح، تعداد) نباید عوض بشن - نمره‌دهیِ finish از همین سوال‌ها حساب می‌شه
// و تغییرشون وسط/بعد از آزمون نمره‌ها رو با هم ناسازگار می‌کنه.
//
// توجه: چک روی exam._count که قبل از تراکنش خونده شده فقط یه fail-fast ارزونه
// (routeها صداش می‌زنن)؛ چک قطعی همین تابع *داخل* withExamWriteLock و با
// تعداد attempt بعد از قفل ردیف آزمون انجام می‌شه (نگاه کن به لایه‌ی سرویس پایین)
export function assertExamQuestionsEditable(exam: {
  _count: { attempts: number };
}): void {
  if (exam._count.attempts > 0) {
    throw conflict(
      'این آزمون قبلاً توسط دانشجو شروع شده - سوال‌هاش قابل تغییر نیستن'
    );
  }
}

// تعداد تلاش مجدد وقتی دو درخواست هم‌زمان همان order را بگیرند (P2002)
const MAX_ORDER_ATTEMPTS = 3;

// order بعدی را از «بیشترین order موجود + ۱» حساب می‌کند، نه از count.
// با count، بعد از حذف یک سوال از وسط، order جدید با یکی از order های
// موجود برخورد می‌کرد (unique روی examId + order) و ساخت سوال جدید
// همیشه با خطای ۴۰۹ رد می‌شد. محاسبه و ساخت داخل یک تراکنش انجام می‌شود.
// تراکنش اول ردیف آزمون را قفل می‌کند و «هنوز attempt ای نیست» را دوباره
// (بعد از قفل) چک می‌کند - پس با شروع هم‌زمان آزمون هم race ندارد؛ چون
// همه‌ی نویسنده‌ها پشت همین قفل صف می‌کشند، برخورد order هم عملاً پیش
// نمی‌آید، ولی retry برای اطمینان می‌ماند.
// beforeExamLock: چکِ اتمیکِ سهمیه‌ی پلن (prepareQuotaGuard) - اول‌ترین کارِ
// تراکنش، قبل از قفل آزمون؛ برای SuperAdmin (معاف از سهمیه) داده نمی‌شه
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
