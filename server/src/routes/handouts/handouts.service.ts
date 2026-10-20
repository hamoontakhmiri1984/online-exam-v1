import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../lib/notifications';
import type { Role } from '../../lib/jwt';

export type DbHandout = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  groupId: string | null;
  instructorId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: Date;
};

// Expose stored fileUrl as objectKey; private downloads require an authorized signed URL.
export function serializeHandout(h: DbHandout) {
  return {
    id: h.id,
    title: h.title,
    description: h.description ?? undefined,
    category: h.category,
    groupId: h.groupId,
    instructorId: h.instructorId,
    fileName: h.fileName,
    objectKey: h.fileUrl,
    fileSize: h.fileSize,
    createdAt: h.createdAt.toISOString(),
  };
}

// Match both category and instructor membership to avoid leaking another instructor's handouts.
export async function loadStudentGroupContext(studentId: string) {
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      groupsMember: {
        select: { id: true, category: true, instructorId: true },
      },
    },
  });
  return user?.groupsMember ?? [];
}

export function studentVisibilityWhere(
  groups: { id: string; category: string; instructorId: string }[]
) {
  if (groups.length === 0) {

    return { id: 'never-matches' };
  }
  const groupIds = groups.map((g) => g.id);
  return {
    OR: [
      { groupId: { in: groupIds } },
      {
        groupId: null,
        OR: groups.map((g) => ({
          category: g.category,
          instructorId: g.instructorId,
        })),
      },
    ],
  };
}

export function studentCanSeeHandout(
  handout: DbHandout,
  groups: { id: string; category: string; instructorId: string }[]
): boolean {
  if (handout.groupId) {
    return groups.some((g) => g.id === handout.groupId);
  }
  return groups.some(
    (g) =>
      g.category === handout.category && g.instructorId === handout.instructorId
  );
}

export async function loadOwnedHandout(id: string, userId: string, role: Role) {
  const handout = await prisma.handout.findUnique({ where: { id } });
  if (!handout) return { handout: null, allowed: false };
  if (role === 'SuperAdmin') return { handout, allowed: true };
  return { handout, allowed: handout.instructorId === userId };
}

// Notification delivery must not fail a successful handout creation.
export async function notifyAudienceAboutHandout(handout: DbHandout) {
  if (handout.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: handout.groupId },
      include: { students: { select: { id: true } } },
    });
    if (!group) return;
    await Promise.all(
      group.students.map((s) =>
        notifyUser(s.id, `جزوه‌ی جدید «${handout.title}» اضافه شد`, 'info')
      )
    );
    return;
  }

  const groups = await prisma.group.findMany({
    where: { instructorId: handout.instructorId, category: handout.category },
    include: { students: { select: { id: true } } },
  });
  const studentIds = new Set<string>();
  for (const g of groups) {
    for (const s of g.students) studentIds.add(s.id);
  }
  await Promise.all(
    [...studentIds].map((id) =>
      notifyUser(id, `جزوه‌ی جدید «${handout.title}» اضافه شد`, 'info')
    )
  );
}
