import type { AdminUser, LoginCredentials } from '@/types';
import { api, setAdminToken } from './apiClient';

/**
 * ============================================================================
 * ADMIN AUTHENTICATION — REAL BACKEND (Stage 5)
 * ============================================================================
 *
 * Authentication happens on the server:
 *
 *   login()           → POST /api/auth/admin/login
 *   logout()          → POST /api/auth/admin/logout
 *   getCurrentAdmin() → cached result of GET /api/auth/admin/me
 *
 * Security properties:
 *   • The password is verified against a bcrypt hash IN THE DATABASE.
 *   • Dual cross-origin transport: HttpOnly cookies + secure Bearer token for cross-domain Vercel/Render reliability.
 *   • Every admin endpoint re-checks the session server-side.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

let currentAdmin: AdminUser | null = null;
let initialised = false;

function emit() {
  listeners.forEach((listener) => listener());
}

export const authService = {
  /** Resolves the session from the server cookie / token. Called on mount. */
  async restore(): Promise<AdminUser | null> {
    try {
      currentAdmin = await api.get<AdminUser | null>('/auth/admin/me');
    } catch {
      currentAdmin = null;
      setAdminToken(null);
    }
    initialised = true;
    emit();
    return currentAdmin;
  },

  async login(credentials: LoginCredentials): Promise<AdminUser> {
    const response = await api.post<AdminUser & { token?: string }>('/auth/admin/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    if (response.token) {
      setAdminToken(response.token);
    }
    const admin: AdminUser = {
      id: response.id,
      email: response.email,
      name: response.name,
      role: response.role,
    };
    currentAdmin = admin;
    initialised = true;
    emit();
    return admin;
  },

  /**
   * Ends the admin session only.
   */
  async logout(): Promise<void> {
    try {
      await api.post<null>('/auth/admin/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      setAdminToken(null);
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
