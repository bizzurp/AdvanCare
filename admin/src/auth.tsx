import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthenticatedHandler, type Me } from './api';

interface AuthState {
  /** undefined while the first /me check is running. */
  me: Me | null | undefined;
  setMe: (me: Me | null) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Set when the server ended the session (idle timeout, suspension, revoked). */
  endedReason: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<Me | null | undefined>(undefined);
  const [endedReason, setEndedReason] = useState<string | null>(null);

  const setMe = useCallback((next: Me | null) => {
    setMeState(next);
    if (next) setEndedReason(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setMeState((await api.me()).me);
    } catch {
      setMeState(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setMeState(null);
  }, []);

  useEffect(() => {
    void refresh();
    setUnauthenticatedHandler(() => {
      setEndedReason('Your session ended. Please sign in again.');
      setMeState(null);
    });
    return () => setUnauthenticatedHandler(null);
  }, [refresh]);

  const value = useMemo(() => ({ me, setMe, refresh, signOut, endedReason }), [me, setMe, refresh, signOut, endedReason]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** A signed-in user (only use inside the signed-in layout). */
export function useMe(): Me {
  const { me } = useAuth();
  if (!me) throw new Error('useMe without a session');
  return me;
}
