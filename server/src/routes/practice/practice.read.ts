import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { parseListQuery } from '../../lib/listPagination';
import { badRequest, notFound } from '../../lib/errors';
import {
  accessiblePractice,
  practiceScope,
  serializePractice,
  type Actor,
} from './practice.access';
import { questionStats } from './practice.answers';
import { questionFilterSchema } from './practice.validation';
export async function listPractices(
  actor: Actor,
  query: Record<string, unknown>,
) {
  const { page, pageSize, skip, search } = parseListQuery(query);
  const where: Prisma.PracticeSetWhereInput = {
    ...practiceScope(actor),
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
  };
  return prisma.$transaction(
    async (db) => {
      const items = await db.practiceSet.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          groups: { include: { group: { select: { id: true, name: true } } } },
          instructor: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      });
      return {
        items: items.map((p) => serializePractice(p, actor)),
        total: await db.practiceSet.count({ where }),
        page,
        pageSize,
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
export async function listPracticeQuestions(
  id: string,
  actor: Actor,
  query: Record<string, unknown>,
) {
  const { page, pageSize, skip, search } = parseListQuery(query);
  const parsed = questionFilterSchema.safeParse(query);
  if (!parsed.success) throw badRequest('فیلتر تمرین نامعتبر است.');
  const { difficulty, progress } = parsed.data;
  const where: Prisma.PracticeQuestionWhereInput = {
    practiceId: id,
    ...(difficulty ? { difficulty } : {}),
    ...(search ? { text: { contains: search, mode: 'insensitive' } } : {}),
    ...(actor.role === 'Student' && progress === 'unanswered'
      ? { attempts: { none: { studentId: actor.sub } } }
      : {}),
    ...(actor.role === 'Student' && progress === 'mistakes'
      ? { attempts: { some: { studentId: actor.sub, isCorrect: false } } }
      : {}),
  };
  return prisma.$transaction(
    async (db) => {
      await accessiblePractice(db, id, actor);
      const questions = await db.practiceQuestion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { position: 'asc' },
      });
      const stats =
        actor.role === 'Student'
          ? await questionStats(
              db,
              actor.sub,
              questions.map((q) => q.id),
            )
          : {};
      const items = questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
        position: q.position,
        ...(actor.role === 'Student'
          ? { stats: stats[q.id] }
          : {
              correctOptionIndex: q.correctOptionIndex,
              sourceQuestionId: q.sourceQuestionId,
            }),
      }));
      return {
        items,
        total: await db.practiceQuestion.count({ where }),
        page,
        pageSize,
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
export async function practiceHistory(
  id: string,
  questionId: string,
  studentId: string,
  query: Record<string, unknown>,
) {
  const { page, pageSize, skip } = parseListQuery(query);
  return prisma.$transaction(
    async (db) => {
      await accessiblePractice(db, id, { sub: studentId, role: 'Student' });
      const question = await db.practiceQuestion.findFirst({
        where: { id: questionId, practiceId: id },
      });
      if (!question) throw notFound();
      const where = { studentId, questionId };
      const items = await db.practiceAttempt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          selectedOptionIndex: true,
          isCorrect: true,
          createdAt: true,
        },
      });
      return {
        items,
        total: await db.practiceAttempt.count({ where }),
        page,
        pageSize,
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
