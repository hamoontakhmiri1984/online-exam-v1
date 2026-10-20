import { logEvent } from './logger';
import { prisma } from './prisma';
import { deleteObject } from './storage';

// Delete an object only after confirming that no database reference remains.
export async function deleteUnreferencedObjects(
  keys: Array<string | null | undefined>
): Promise<void> {
  const unique = [...new Set(keys.filter((k): k is string => Boolean(k)))];

  for (const key of unique) {
    try {
      const [sessions, attachments, handouts] = await Promise.all([
        prisma.lessonSession.count({ where: { videoObjectUrl: key } }),
        prisma.lessonAttachment.count({ where: { fileUrl: key } }),
        prisma.handout.count({ where: { fileUrl: key } }),
      ]);
      if (sessions + attachments + handouts > 0) continue;
      await deleteObject(key);
    } catch (err) {
      logEvent('error', 'deleteUnreferencedObjects failed:', err);
    }
  }
}
