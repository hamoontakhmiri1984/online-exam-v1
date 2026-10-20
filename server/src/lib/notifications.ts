import { prisma } from './prisma';
import { getIo } from '../realtime/socket';
import type { Role } from './jwt';

export type NotificationIcon = 'info' | 'people' | 'award';

// Broadcast read state belongs to the recipient, not the shared notification.
export function serializeNotification(
  n: {
    id: string;
    userId: string | null;
    targetRoles: Role[];
    title: string;
    icon: NotificationIcon;
    createdAt: Date;
  },
  isRead: boolean
) {
  return {
    id: n.id,
    userId: n.userId ?? undefined,
    targetRoles: n.targetRoles.length > 0 ? n.targetRoles : undefined,
    title: n.title,
    createdAt: n.createdAt.toISOString(),
    read: isRead,
    icon: n.icon,
  };
}

// Socket delivery is best-effort; persisted notifications remain available.
function pushLive(notification: ReturnType<typeof serializeNotification>) {
  try {
    const io = getIo();
    if (notification.userId) {
      io.to(`user:${notification.userId}`).emit(
        'notification:new',
        notification
      );
    } else {
      for (const role of notification.targetRoles ?? []) {
        io.to(`role:${role}`).emit('notification:new', notification);
      }
    }
  } catch {
  }
}

export async function notifyUser(
  userId: string,
  title: string,
  icon: NotificationIcon
) {
  const notification = await prisma.notification.create({
    data: { userId, title, icon },
  });
  const serialized = serializeNotification(notification, false);
  pushLive(serialized);
  return serialized;
}

export async function notifyRoles(
  roles: Role[],
  title: string,
  icon: NotificationIcon
) {
  const notification = await prisma.notification.create({
    data: { targetRoles: roles, title, icon },
  });
  const serialized = serializeNotification(notification, false);
  pushLive(serialized);
  return serialized;
}
