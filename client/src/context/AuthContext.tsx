import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAuthToken } from '../lib/apiClient';
import { bootstrapSession, getCurrentUser, logout as logoutRequest, subscribeToAuth, type User } from '../api/authApi';
type SessionState = 'loading' | 'ready' | 'unavailable';
export type AuthContextValue = { user: User | null; isAuthenticated: boolean; isSessionReady: boolean; isSessionUnavailable: boolean; retrySession: () => void; logout: () => void; };
type AuthProviderProps = { children: ReactNode; };
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  useEffect(() => subscribeToAuth(currentUser => {
    setUser(currentUser);
    if (currentUser && getAuthToken()) setSessionState('ready');
  }), []);
  const initializeSession = useCallback(async (isActive: () => boolean, showLoading = true) => {
    if (showLoading) setSessionState('loading');
    // The Codespaces forwarded API often needs a moment after a page reload.
    // Keep authentication guarded and retry a temporary network/server failure
    // before showing a connection warning; never retry an explicit 401.
    for (let attempt = 0; attempt < 4 && isActive(); attempt++) {
      if (getCurrentUser() && getAuthToken()) {
        setSessionState('ready');
        return;
      }
      let next: SessionState = 'unavailable';
      try {
        const result = await bootstrapSession();
        next = result.status === 'unavailable' ? 'unavailable' : 'ready';
      } catch {
        next = 'unavailable';
      }
      if (!isActive()) return;
      if (next === 'ready') {
        setSessionState('ready');
        return;
      }
      if (attempt < 3) {
        await new Promise<void>(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    if (isActive()) setSessionState('unavailable');
  }, []);
  useEffect(() => {
    let active = true;
    void initializeSession(() => active);
    return () => { active = false; };
  }, [initializeSession]);
  // A startup outage is not a logout: reconnect automatically without
  // forcing the user to repeatedly press Refresh or log in again.
  useEffect(() => {
    if (sessionState !== 'unavailable') return;
    let active = true;
    const reconnect = async () => {
      // Keep the recovery screen mounted while a background attempt is running.
      await initializeSession(() => active, false);
      if (active) timer = window.setTimeout(reconnect, 6000);
    };
    let timer = window.setTimeout(reconnect, 6000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [sessionState, initializeSession]);
  const retrySession = useCallback(() => { void initializeSession(() => true); }, [initializeSession]);
  function logout(): void { logoutRequest(); }
  const value = useMemo<AuthContextValue>(() => ({ user, isAuthenticated: user !== null, isSessionReady: sessionState === 'ready', isSessionUnavailable: sessionState === 'unavailable', retrySession, logout }), [user, sessionState, retrySession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }