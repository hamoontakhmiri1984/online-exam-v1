import { logEvent } from '../lib/logger';
import { periodicTask } from '../lib/periodicTask';
import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { env } from '../config/env';
import { getActiveSessionId, isSessionValid } from '../lib/session';
import { prisma } from '../lib/prisma';
import { instructorApprovalBlockMessage } from '../lib/accountAccess';

let io: Server | null = null;
let stopSweep: (() => Promise<void>) | undefined;

export async function stopSocketSweep() { await stopSweep?.(); }

async function isAccountAllowed(userId: string, role: string): Promise<boolean> {
  if (role !== 'Instructor') return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, approvalStatus: true },
  });
  return Boolean(user && user.role === role && !instructorApprovalBlockMessage(user));
}

const userRoom = (userId: string) => `user:${userId}`;
const roleRoom = (role: string) => `role:${role}`;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('unauthorized'));

      const payload = verifyAccessToken(token);

      // Unavailable session storage is retryable, not an authentication rejection.
      let valid: boolean;
      try {
        valid = await isSessionValid(payload.sub, payload.sid);
        if (valid && !(await isAccountAllowed(payload.sub, payload.role))) {
          return next(new Error('session-expired'));
        }
      } catch {
        return next(new Error('unavailable'));
      }
      if (!valid) return next(new Error('session-expired'));

      socket.data.userId = payload.sub;
      socket.data.sessionId = payload.sid;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.join(userRoom(socket.data.userId));
    socket.join(roleRoom(socket.data.role));
  });

  stopSweep = startSocketSessionSweep(io);

  return io;
}

// Revalidate connected sessions so revocation also stops socket delivery.
const SESSION_SWEEP_INTERVAL_MS = 60_000;

function startSocketSessionSweep(server: Server) {
  return periodicTask(async () => {
    try {
      const users = new Map<string, string>();
      for (const socket of server.sockets.sockets.values()) {
        users.set(socket.data.userId as string, socket.data.role as string);
      }

      for (const [userId, role] of users) {
        if (
          (await getActiveSessionId(userId)) !== null &&
          (await isAccountAllowed(userId, role))
        ) continue;
        forceLogoutOtherSessions(userId, undefined, 'session-ended');
      }
    } catch (err) {
      logEvent('error', 'socket session sweep failed:', err);
    }
  }, SESSION_SWEEP_INTERVAL_MS, err => logEvent('error', 'socket session sweep failed:', err));
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io has not been initialized yet');
  return io;
}

export function forceLogoutOtherSessions(
  userId: string,
  exceptSessionId?: string,
  reason = 'new-session-started'
) {
  if (!io) return;
  const room = io.sockets.adapter.rooms.get(userRoom(userId));
  if (!room) return;

  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    if (exceptSessionId && socket.data.sessionId === exceptSessionId) continue;
    socket.emit('force-logout', { reason });
    socket.disconnect(true);
  }
}
