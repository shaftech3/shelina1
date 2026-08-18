import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, mediaService } from '@/services';
import type { AdminUser, LoginCredentials } from '@/types';
import { AdminAuthContext, type AdminAuthContextValue } from './context';

/**
 * Owns admin session state.
 *
 * The UI never touches `authService` storage directly — it calls `login` /
 * `logout` here and reads `admin`. When the backend arrives, only the service
 * body changes; this provider's contract is already correct.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [initialising, setInitialising] = useState(true);

  // Resolve any existing session before rendering a guarded route, otherwise
  // a logged-in admin refreshing /admin/products would flash the login page.
  //
  // Stage 5: the session lives in an HttpOnly cookie the browser cannot read,
  // so this asks the SERVER who we are (GET /api/auth/admin/me) instead of
  // reading storage.
  useEffect(() => {
    let active = true;

    void authService.restore().then((user) => {
      if (!active) return;
      setAdmin(user);
      setInitialising(false);
    });

    // Keeps this provider in step if the session is cleared elsewhere
    // (expiry, or a logout triggered from another component).
    const unsubscribe = authService.subscribe(() => setAdmin(authService.getCurrentAdmin()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const user = await authService.login(credentials);
    setAdmin(user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    // Development object URLs belong to the admin session; releasing them on
    // logout prevents a slow memory leak across repeated sign-ins.
    mediaService.releaseAll();
    setAdmin(null);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ admin, isAuthenticated: admin !== null, initialising, login, logout }),
    [admin, initialising, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
