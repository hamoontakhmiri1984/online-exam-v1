import { ApiError, apiRequest, getAuthToken, refreshSession, setAuthToken, setOnSessionExpired } from '../../lib/apiClient';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import type { MeResponse, User } from './auth.types';
import { userFromMe } from './auth.utils';
type AuthListener = (user: User | null) => void;
let currentUser: User | null = null;
const authListeners = new Set<AuthListener>();
export function getCurrentUser(): User | null { return currentUser; }
export function subscribeToAuth(listener: AuthListener): () => void { authListeners.add(listener); return () => { authListeners.delete(listener); }; }
function notifyAuthListeners(): void { authListeners.forEach((listener) => listener(currentUser)); }
export function setCurrentUser(user: User | null): void { currentUser = user; notifyAuthListeners(); }
export function applySession(user: User, accessToken: string): void { setCurrentUser(user); setAuthToken(accessToken); connectSocket(getAuthToken, () => { clearSession(); window.location.href = '/login?forceLogout=1'; }); }
export function clearSession(): void { setCurrentUser(null); setAuthToken(null); disconnectSocket(); }
setOnSessionExpired(() => { if (!currentUser) return; clearSession(); window.location.href = '/login?sessionExpired=1'; });
export type BootstrapResult =
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous' }
  | { status: 'unavailable' };

// فقط وقتی سرور صریحاً بگوید نشست معتبر نیست (۴۰۱/۴۰۳) کاربر مهمان حساب می‌شود.
// قطعی شبکه، ۵xx، ۴۲۹ و ... یعنی «نامعلوم» و نباید به لاگین هدایت کند.
export async function bootstrapSession(): Promise<BootstrapResult> {
  const outcome = await refreshSession();
  if (outcome.status === 'expired') { clearSession(); return { status: 'anonymous' }; }
  if (outcome.status === 'unavailable') { setAuthToken(null); return { status: 'unavailable' }; }
  setAuthToken(outcome.token);
  try {
    const me = await apiRequest<MeResponse>('/auth/me');
    const user = userFromMe(me);
    applySession(user, outcome.token);
    return { status: 'authenticated', user };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) { clearSession(); return { status: 'anonymous' }; }
    setAuthToken(null);
    return { status: 'unavailable' };
  }
}
export function logout(): void { apiRequest('/auth/logout', { method: 'POST' }).catch(() => {}); clearSession(); }