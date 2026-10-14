import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { StaffUser } from '../types';
import {
  isTwoFactorPending, setUnauthorizedHandler, staffLogin, staffLoginTwoFactor, staffLogout, staffMe,
  type TwoFactorPending,
} from '../lib/staffApi';
import { setHrUnauthorizedHandler } from '../lib/hrApi';

export interface StaffAuthState {
  user: StaffUser | null;
  /** true until the first GET /api/staff/auth/me settles */
  loading: boolean;
  /** Resolves with the user, or with a pending step when the account uses two-step login. */
  login: (email: string, password: string) => Promise<StaffUser | TwoFactorPending>;
  /** Second step: the 6-digit code (or a recovery code) for a pending login. */
  completeTwoFactor: (pendingToken: string, code: string) => Promise<StaffUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StaffAuthState>({
  user: null,
  loading: true,
  login: async () => { throw new Error('StaffAuthProvider is missing'); },
  completeTwoFactor: async () => { throw new Error('StaffAuthProvider is missing'); },
  logout: async () => { /* no-op */ },
  refresh: async () => { /* no-op */ },
});

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await staffMe());
    } catch {
      // 401 (no session) or the API is down. Either way there is nobody signed in.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // A 401 on any staff or HR call means the 8h cookie lapsed: drop the user so
  // the route guard sends the operator back to /staff/login. Both API clients
  // report here, so a careers request that lapses behaves like a bookings one.
  useEffect(() => {
    const drop = () => { setUser(null); setLoading(false); };
    setUnauthorizedHandler(drop);
    setHrUnauthorizedHandler(drop);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await staffLogin(email, password);
    if (isTwoFactorPending(next)) return next;
    setUser(next);
    setLoading(false);
    return next;
  }, []);

  const completeTwoFactor = useCallback(async (pendingToken: string, code: string) => {
    const next = await staffLoginTwoFactor(pendingToken, code);
    setUser(next);
    setLoading(false);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try { await staffLogout(); } catch { /* clearing locally is enough */ }
    setUser(null);
  }, []);

  const value = useMemo<StaffAuthState>(
    () => ({ user, loading, login, completeTwoFactor, logout, refresh }),
    [user, loading, login, completeTwoFactor, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStaffAuth(): StaffAuthState {
  return useContext(Ctx);
}
