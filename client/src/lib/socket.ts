
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL: string =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  'http://localhost:4000';

let socket: Socket | null = null;

// Retry unavailable session checks without treating them as logout.
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

function clearRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAttempt = 0;
}

// Read the current token on each reconnect.
export function connectSocket(
  getToken: () => string | null,
  onForceLogout: (reason?: string) => void
): void {
  disconnectSocket();

  socket = io(SOCKET_URL, {
    auth: (cb) => cb({ token: getToken() }),
    withCredentials: true,
  });

  const current = socket;
  current.on('force-logout', (payload?: { reason?: unknown }) => {
    if (socket !== current) return;
    onForceLogout(typeof payload?.reason === 'string' ? payload.reason : undefined);
  });
  current.on('connect', () => clearRetry());
  current.on('connect_error', (err) => {
    if (err.message !== 'unavailable') return;
    if (retryTimer) return;
    const delay = Math.min(RETRY_BASE_MS * 2 ** retryAttempt, RETRY_MAX_MS);
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      // Ignore events from a disconnected or replaced socket.
      if (socket === current) current.connect();
    }, delay);
  });
}

export function disconnectSocket(): void {
  clearRetry();
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
