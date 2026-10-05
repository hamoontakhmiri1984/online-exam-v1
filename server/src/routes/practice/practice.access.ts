import { Prisma } from '@prisma/client';
import { notFound } from '../../lib/errors';
export type Actor = { sub: string; role: string };
export function practiceScope(actor: Actor): Prisma.PracticeSetWhereInput {
  if (actor.role === 'SuperAdmin') return {};
  if (actor.role === 'Instructor') return { instructorId: actor.sub };
  return {
    status: 'Published',
    groups: { some: { group: { students: { some: { id: actor.sub } } } } },
  };
}
export async function accessiblePractice(
  db: Prisma.TransactionClient,
  id: string,
  actor: Actor,
) {
  const practice = await db.practiceSet.findFirst({
    where: { id, ...practiceScope(actor) },
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
      instructor: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!practice) throw notFound('تمرین یافت نشد یا دسترسی شما تغییر کرده است.');
  return practice;
}
export function serializePractice(
  p: Awaited<ReturnType<typeof accessiblePractice>>,
  actor: Actor,
) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    publishedAt: p.publishedAt,
    instructorName: p.instructor.name,
    questionCount: p._count.questions,
    // Do not expose other groups' identities to a learner.
    groups:
      actor.role === 'Student' ? [] : p.groups.map((access) => access.group),
  };
}
