import type { ID } from './catalog';

/**
 * Customer account shapes.
 *
 * Stage 5: customer authentication is implemented for real against the
 * `customer_users` table. Passwords are hashed with bcrypt server-side and the
 * session is an HttpOnly cookie, so no credential is ever held here.
 *
 * This is entirely separate from the admin account (`AdminUser` in
 * `types/admin.ts`). The two systems must never share a session, a service or
 * a storage key: an admin signing in must not affect the storefront, and a
 * customer must never gain admin access.
 */
export interface CustomerAccount {
  id: ID;
  email: string;
  /** Single free-form display name, matching the CustomerUser table. */
  name: string;
}

/** What the header needs to decide which menu items to show. */
export interface CustomerSessionState {
  customer: CustomerAccount | null;
  isAuthenticated: boolean;
  /** True once a customer auth backend is connected (Stage 5 onwards). */
  isEnabled: boolean;
}
