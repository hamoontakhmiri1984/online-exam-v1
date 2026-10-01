import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { bootstrapSession, getCurrentUser, logout as logoutRequest, subscribeToAuth, type User } from '../api/authApi';
type SessionState = 'loading' | 'ready' | 'unavailable';
type AuthContextValue = { user: User | null; isAuthenticated: boolean; isSessionReady: boolean; isSessionUnavailable: boolean; retrySession: () => void; logout: () => void; };
type AuthProviderProps = { children: ReactNode; };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  useEffect(() => subscribeToAuth(setUser), []);
  const initializeSession = useCallback(async (isActive: () => boolean) => {
    setSessionState('loading');
    let next: SessionState = 'unavailable';
    try { const result = await bootstrapSession(); next = result.status === 'unavailable' ? 'unavailable' : 'ready'; } catch { next = 'unavailable'; }
    if (isActive()) setSessionState(next);
  }, []);
  useEffect(() => { let active = true; void initializeSession(() => active); return () => { active = false; }; }, [initializeSession]);
  const retrySession = useCallback(() => { void initializeSession(() => true); }, [initializeSession]);
  function logout(): void { logoutRequest(); }
  const value = useMemo<AuthContextValue>(() => ({ user, isAuthenticated: user !== null, isSessionReady: sessionState === 'ready', isSessionUnavailable: sessionState === 'unavailable', retrySession, logout }), [user, sessionState, retrySession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }