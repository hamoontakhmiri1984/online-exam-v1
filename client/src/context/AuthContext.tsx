import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { bootstrapSession, getCurrentUser, logout as logoutRequest, subscribeToAuth, type User } from '../api/authApi';
type AuthContextValue = { user: User | null; isAuthenticated: boolean; isSessionReady: boolean; logout: () => void; };
type AuthProviderProps = { children: ReactNode; };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [isSessionReady, setIsSessionReady] = useState(false);
  useEffect(() => subscribeToAuth(setUser), []);
  useEffect(() => { let active = true; async function initializeSession() { try { await bootstrapSession(); } finally { if (active) setIsSessionReady(true); } } void initializeSession(); return () => { active = false; }; }, []);
  function logout(): void { logoutRequest(); }
  const value = useMemo<AuthContextValue>(() => ({ user, isAuthenticated: user !== null, isSessionReady, logout }), [user, isSessionReady]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
