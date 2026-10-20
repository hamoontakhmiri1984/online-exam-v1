import { prisma } from '../../lib/prisma';
import { forbidden, badRequest } from '../../lib/errors';
import type { Role } from '../../lib/jwt';
import { canUseObjectKeys } from '../../lib/objectKeys';

export type DbSession = {
  id: string;
  category: string;
  title: string;
  description: string;
  videoType: 'LINK' | 'UPLOAD';
  videoUrl: string | null;
  videoFileName: string | null;
  videoObjectUrl: string | null;
  groups: { id: string }[];
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }[];
};

// Expose stored video/file keys as objectKey, never as directly usable URLs.
export function serializeSession(s: DbSession) {
  const video =
    s.videoType === 'LINK'
      ? { type: 'link' as const, url: s.videoUrl ?? '' }
      : {
          type: 'upload' as const,
          fileName: s.videoFileName ?? '',
          objectKey: s.videoObjectUrl ?? '',
        };

  return {
    id: s.id,
    category: s.category,
    groupIds: s.groups.map((g) => g.id),
    title: s.title,
    description: s.description,
    video,
    attachments: s.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      objectKey: a.fileUrl,
      fileSize: a.fileSize,
    })),
  };
}

export const withGroups = {
  groups: { select: { id: true } },
  attachments: {
    select: { id: true, fileName: true, fileUrl: true, fileSize: true },
    // Keep attachment order deterministic across updates.
    orderBy: { createdAt: 'asc' },
  },
} as const;

// Use deterministic ordering because the client numbers lessons by list position.
export const sessionOrder = { createdAt: 'asc' } as const;

export function videoToDbFields(
  video:
    | { type: 'link'; url: string }
    | { type: 'upload'; fileName: string; objectKey: string }
) {
  return video.type === 'link'
    ? {
        videoType: 'LINK' as const,
        videoUrl: video.url,
        videoFileName: null,
        videoObjectUrl: null,
      }
    : {
        videoType: 'UPLOAD' as const,
        videoUrl: null,
        videoFileName: video.fileName,
        videoObjectUrl: video.objectKey,
      };
}

// Instructors may reuse existing keys or their own uploads; SuperAdmin bypasses ownership checks.
export function assertFileKeysAllowed(
  user: { sub: string; role: Role },
  data: {
    video: { type: 'link' } | { type: 'upload'; objectKey: string };
    attachments: { objectKey: string }[];
  },
  existing?: DbSession
) {
  if (user.role === 'SuperAdmin') return;

  const videoOk =
    data.video.type !== 'upload' ||
    canUseObjectKeys(
      'lesson-videos',
      user.sub,
      [data.video.objectKey],
      existing?.videoObjectUrl ? [existing.videoObjectUrl] : []
    );
  const attachmentsOk = canUseObjectKeys(
    'lesson-attachments',
    user.sub,
    data.attachments.map((a) => a.objectKey),
    existing?.attachments.map((a) => a.fileUrl) ?? []
  );

  if (!videoOk || !attachmentsOk) {
    throw forbidden('فایل انتخاب‌شده متعلق به تو نیست');
  }
}

// Check group existence explicitly for SuperAdmin before connecting relations.
export async function assertGroupsExist(groupIds: string[]) {
  const unique = new Set(groupIds);
  if (unique.size === 0) return;
  const found = await prisma.group.count({
    where: { id: { in: [...unique] }, approvalStatus: 'Approved' },
  });
  if (found !== unique.size) throw badRequest('گروه یافت نشد');
}

export async function ownedGroupIds(userId: string): Promise<Set<string>> {
  const groups = await prisma.group.findMany({
    where: { instructorId: userId, approvalStatus: 'Approved' },
    select: { id: true },
  });
  return new Set(groups.map((g) => g.id));
}

// Authorize lesson access explicitly before issuing private download URLs.
export async function loadAccessibleSession(
  sessionId: string,
  userId: string,
  role: Role
): Promise<{ session: DbSession | null; allowed: boolean }> {
  const session = await prisma.lessonSession.findUnique({
    where: { id: sessionId },
    include: withGroups,
  });
  if (!session) return { session: null, allowed: false };

  if (role === 'SuperAdmin') return { session, allowed: true };

  const groupIds = session.groups.map((g) => g.id);

  if (role === 'Instructor') {
    const owned = await prisma.group.count({
      where: { id: { in: groupIds }, instructorId: userId },
    });
    return { session, allowed: owned > 0 };
  }

  const isMember = await prisma.group.count({
    where: { id: { in: groupIds }, approvalStatus: 'Approved', students: { some: { id: userId } } },
  });
  return { session, allowed: isMember > 0 };
}
