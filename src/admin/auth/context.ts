import { createContext } from 'react';
import type { AdminUser, LoginCredentials } from '@/types';

/**
 * Admin auth context, in its own module (no components) so the provider and
 * the hook can both import it without breaking React Fast Refresh — the same
 * split the cart module uses.
 */
export interface AdminAuthContextValue {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  /** True while the initial session check runs, before the first paint decision. */
  initialising: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
