import type { AdminUser, LoginCredentials } from '@/types';
import { api } from './apiClient';

/**
 * ============================================================================
 * ADMIN AUTHENTICATION — REAL BACKEND (Stage 5)
 * ============================================================================
 *
 * The Stage 4 development adapter is gone. Authentication now happens on the
 * server:
 *
 *   login()           → POST /api/auth/admin/login
 *   logout()          → POST /api/auth/admin/logout
 *   getCurrentAdmin() → cached result of GET /api/auth/admin/me
 *
 * Security properties this gives us, none of which the Stage 4 version had:
 *
 *   • The password is verified against a bcrypt hash IN THE DATABASE. No
 *     credential of any kind exists in the frontend bundle or in any env var
 *     the browser can read.
 *   • The session is a signed JWT in an HttpOnly cookie. JavaScript cannot
 *     read it, so XSS cannot exfiltrate the session.
 *   • Every admin endpoint re-checks the session server-side. The React route
 *     guard is now purely a UX affordance — bypassing it in devtools reveals
 *     an empty shell whose API calls all return 401.
 *
 * ADMIN / CUSTOMER SEPARATION: this module only ever touches
 * `/api/auth/admin/*` and the admin cookie. A customer session cannot satisfy
 * an admin guard — the token's audience claim is checked on the server.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Cached session so `getCurrentAdmin()` / `isAuthenticated()` can stay
 * synchronous for the existing `useAdminAuth` consumers. It is a mirror of the
 * server's answer, never the source of truth: the cookie is.
 */
let currentAdmin: AdminUser | null = null;
let initialised = false;

function emit() {
  listeners.forEach((listener) => listener());
}

export const authService = {
  /** Resolves the session from the server cookie. Called once on mount. */
  async restore(): Promise<AdminUser | null> {
    try {
      currentAdmin = await api.get<AdminUser | null>('/auth/admin/me');
    } catch {
      // A network failure must not look like a valid session.
      currentAdmin = null;
    }
    initialised = true;
    emit();
    return currentAdmin;
  },

  async login(credentials: LoginCredentials): Promise<AdminUser> {
    const admin = await api.post<AdminUser>('/auth/admin/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    currentAdmin = admin;
    initialised = true;
    emit();
    return admin;
  },

  /**
   * Ends the admin session only.
   *
   * The customer's cart lives in localStorage under a different key and is
   * never touched here — logging out of the admin panel must not empty a
   * shopper's bag.
   */
  async logout(): Promise<void> {
    try {
      await api.post<null>('/auth/admin/logout');
    } finally {
      currentAdmin = null;
      emit();
    }
  },

  getCurrentAdmin(): AdminUser | null {
    return currentAdmin;
  },

  isAuthenticated(): boolean {
    return currentAdmin !== null;
  },

  hasRestored(): boolean {
    return initialised;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
