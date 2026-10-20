import { prisma } from '../../lib/prisma';
import { badRequest } from '../../lib/errors';
import type { Role } from '../../lib/jwt';

export function serializeGroup(group: {
  id: string;
  name: string;
  category: string;
  instructorId: string;
  joinCode: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  students: { id: string }[];
}) {
  return {
    id: group.id,
    approvalStatus: group.approvalStatus,
    name: group.name,
    category: group.category,
    instructorId: group.instructorId,
    joinCode: group.joinCode,
    studentIds: group.students.map((s) => s.id),
  };
}

export const withStudents = { students: { select: { id: true } } } as const;

// Only students already associated with this instructor can be assigned directly.
export async function resolveStudentIds(
  rawIds: string[],
  role: Role,
  instructorId: string
): Promise<{ id: string }[]> {
  const ids = [...new Set(rawIds)];
  if (ids.length === 0) return [];

  const valid = await prisma.user.count({
    where: {
      id: { in: ids },
      role: 'Student',
      ...(role === 'Instructor'
        ? { groupsMember: { some: { instructorId } } }
        : {}),
    },
  });
  if (valid !== ids.length) {
    throw badRequest('لیست دانشجوها نامعتبره');
  }
  return ids.map((id) => ({ id }));
}
