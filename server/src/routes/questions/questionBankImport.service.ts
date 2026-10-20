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

// Foreign and missing questions both return not found to avoid disclosing ownership.
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
