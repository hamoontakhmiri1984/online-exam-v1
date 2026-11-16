import { randomInt } from 'node:crypto';
import type { QuestionDifficulty } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../lib/errors';
import { practiceDifficulties, type randomPracticeQuestionsSchema } from './practice.validation';

const labels: Record<QuestionDifficulty, string> = {
  Easy: 'آسان', Medium: 'متوسط', Hard: 'سخت',
};

function takeRandom<T>(items: T[], count: number): T[] {
  for (let index = 0; index < count; index++) {
    const swap = randomInt(index, items.length);
    [items[index], items[swap]] = [items[swap], items[index]];
  }
  return items.slice(0, count);
}

export async function randomPracticeQuestions(
  owner: string,
  { bankIds, counts, excludeQuestionIds }: z.infer<typeof randomPracticeQuestionsSchema>,
) {
  return prisma.$transaction(async (db) => {
    const bankCount = await db.questionBank.count({
      where: { id: { in: bankIds }, instructorId: owner },
    });
    if (bankCount !== bankIds.length) throw notFound('یک یا چند بانک سؤال در دسترس شما نیست.');

    const pool = await db.question.findMany({
      where: {
        bankId: { in: bankIds },
        bank: { instructorId: owner },
        id: { notIn: excludeQuestionIds },
        difficulty: { in: practiceDifficulties.filter(level => counts[level] > 0) },
      },
      select: { id: true, difficulty: true },
    });
    const pools: Record<QuestionDifficulty, string[]> = { Easy: [], Medium: [], Hard: [] };
    for (const question of pool) pools[question.difficulty].push(question.id);

    const shortages = practiceDifficulties.flatMap(level => {
      const available = pools[level].length;
      return available < counts[level]
        ? [`${labels[level]}: ${counts[level].toLocaleString('fa-IR')} درخواست شد، ${available.toLocaleString('fa-IR')} موجود است`]
        : [];
    });
    if (shortages.length) throw badRequest(`سؤال کافی در بانک‌های انتخاب‌شده وجود ندارد. ${shortages.join('؛ ')}.`);

    const picked = practiceDifficulties.flatMap(level => takeRandom(pools[level], counts[level]));
    const questions = await db.question.findMany({
      where: { id: { in: picked }, bank: { instructorId: owner } },
      select: { id: true, bankId: true, text: true, difficulty: true },
    });
    return takeRandom(questions, questions.length);
  }, { isolationLevel: 'RepeatableRead' });
}
