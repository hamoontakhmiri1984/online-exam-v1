import { prisma } from '../../lib/prisma';
import { notFound } from '../../lib/errors';
import { withNextOrder } from './examQuestions.service';

type BankQuestionRecord = {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
};

export type ImportedExamQuestion = {
  id: string;
  examId: string;
  questionId: string | null;
  order: number;
  textSnapshot: string;
  optionsSnapshot: string[];
  correctIndexSnapshot: number;
};

// ownerId: وقتی مقدار داره (Instructor)، فقط سوال‌های بانک‌های خودِ همین مدرس
// قابل‌ایمپورتن؛ SuperAdmin ownerId نمی‌ده. قبلاً هر سوالی با هر id ای (حتی از
// بانکِ مدرس دیگه، همراه با جواب صحیح) قابل کپی به آزمون خودت بود. سوالِ
// متعلق به دیگری دقیقاً مثل سوالِ ناموجود notFound می‌ده تا وجودش لو نره.
export async function importBankQuestionsToExam(
  examId: string,
  questionIds: string[],
  ownerId?: string
): Promise<ImportedExamQuestion[]> {
  const questions = (await prisma.question.findMany({
    where: {
      id: {
        in: questionIds,
      },
      ...(ownerId ? { bank: { instructorId: ownerId } } : {}),
    },
  })) as BankQuestionRecord[];

  if (questions.length !== questionIds.length) {
    throw notFound('یک یا چند سوال بانک پیدا نشد');
  }

  const questionMap = new Map<string, BankQuestionRecord>(
    questions.map((question) => [question.id, question])
  );

  const orderedQuestions: BankQuestionRecord[] = questionIds.map((id) => {
    const question = questionMap.get(id);

    if (!question) {
      throw notFound('سوال بانک پیدا نشد');
    }

    return question;
  });

  return withNextOrder(examId, async (tx, startOrder) => {
    const created: ImportedExamQuestion[] = [];

    for (const [index, question] of orderedQuestions.entries()) {
      created.push(
        await tx.examQuestion.create({
          data: {
            examId,
            questionId: question.id,
            order: startOrder + index,
            textSnapshot: question.text,
            optionsSnapshot: question.options,
            correctIndexSnapshot: question.correctOptionIndex,
          },
        })
      );
    }

    return created;
  });
}
