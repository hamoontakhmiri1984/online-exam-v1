import { apiRequest, getAuthToken, refreshAccessToken, setAuthToken, setOnSessionExpired } from '../../lib/apiClient';
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
export async function bootstrapSession(): Promise<User | null> { try { const accessToken = await refreshAccessToken(); if (!accessToken) { clearSession(); return null; } setAuthToken(accessToken); const me = await apiRequest<MeResponse>('/auth/me'); const user = userFromMe(me); applySession(user, accessToken); return user; } catch { clearSession(); return null; } }
export function logout(): void { apiRequest('/auth/logout', { method: 'POST' }).catch(() => {}); clearSession(); }
