import { Prisma, PracticeStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../lib/errors';
import {
  createPracticeSchema,
  updatePracticeSchema,
} from './practice.validation';
import type { z } from 'zod';
type Input = z.infer<typeof updatePracticeSchema>;
async function ownedGroups(
  db: Prisma.TransactionClient,
  owner: string,
  ids: string[],
) {
  const count = await db.group.count({
    where: { id: { in: ids }, instructorId: owner, approvalStatus: 'Approved' },
  });
  if (count !== ids.length) throw notFound('یک یا چند گروه متعلق به شما نیست.');
}
async function snapshots(
  db: Prisma.TransactionClient,
  owner: string,
  ids: string[],
) {
  const items = await db.question.findMany({
    where: { id: { in: ids }, bank: { instructorId: owner } },
  });
  if (items.length !== ids.length)
    throw notFound('یک یا چند سؤال متعلق به بانک‌های شما نیست.');
  const map = new Map(items.map((q) => [q.id, q]));
  return ids.map((id, position) => {
    const q = map.get(id)!;
    return {
      sourceQuestionId: id,
      position,
      text: q.text,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      difficulty: q.difficulty,
    };
  });
}
export async function createPractice(
  owner: string,
  input: z.infer<typeof createPracticeSchema>,
) {
  return prisma.$transaction(async (db) => {
    await ownedGroups(db, owner, input.groupIds);
    const questions = await snapshots(db, owner, input.questionIds);
    return db.practiceSet.create({
      data: {
        instructorId: owner,
        title: input.title,
        description: input.description,
        groups: { create: input.groupIds.map((groupId) => ({ groupId })) },
        questions: { create: questions },
      },
      select: { id: true },
    });
  });
}
export async function updatePractice(id: string, owner: string, input: Input) {
  return prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM practice_sets WHERE id = ${id} FOR UPDATE`;
    const practice = await db.practiceSet.findFirst({
      where: { id, instructorId: owner },
    });
    if (!practice) throw notFound();
    if (input.questionIds && practice.publishedAt)
      throw conflict(
        'سؤال‌های تمرین منتشرشده ثابت هستند؛ مجموعهٔ تازه بسازید.',
      );
    if (practice.status === 'Published' && !input.groupIds.length)
      throw badRequest('تمرین منتشرشده باید حداقل یک گروه داشته باشد.');
    await ownedGroups(db, owner, input.groupIds);
    if (input.questionIds) {
      const questions = await snapshots(db, owner, input.questionIds);
      await db.practiceQuestion.deleteMany({ where: { practiceId: id } });
      await db.practiceQuestion.createMany({
        data: questions.map((q) => ({ ...q, practiceId: id })),
      });
    }
    await db.practiceSetGroup.deleteMany({ where: { practiceId: id } });
    await db.practiceSetGroup.createMany({
      data: input.groupIds.map((groupId) => ({ groupId, practiceId: id })),
    });
    return db.practiceSet.update({
      where: { id },
      data: { title: input.title, description: input.description },
      select: { id: true },
    });
  });
}
export async function setPracticeStatus(
  id: string,
  owner: string,
  status: PracticeStatus,
) {
  return prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM practice_sets WHERE id = ${id} FOR UPDATE`;
    const p = await db.practiceSet.findFirst({
      where: { id, instructorId: owner },
      include: { _count: { select: { questions: true, groups: true } } },
    });
    if (!p) throw notFound();
    if (status === 'Published' && (!p._count.groups || !p._count.questions))
      throw badRequest('برای انتشار، حداقل یک گروه و یک سؤال لازم است.');
    return db.practiceSet.update({
      where: { id },
      data: {
        status,
        ...(status === 'Published' && !p.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      },
      select: { id: true },
    });
  });
}
