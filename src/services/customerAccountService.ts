import type { CustomerAccount, CustomerSessionState } from '@/types';
import { api } from './apiClient';

/**
 * ============================================================================
 * CUSTOMER ACCOUNTS — REAL BACKEND (Stage 5)
 * ============================================================================
 *
 * Customer authentication now exists for real:
 *
 *   register() → POST /api/auth/customer/register
 *   signIn()   → POST /api/auth/customer/login
 *   signOut()  → POST /api/auth/customer/logout
 *   restore()  → GET  /api/auth/customer/me
 *
 * Passwords are hashed with bcrypt on the server and the session is a signed
 * JWT in an HttpOnly cookie, exactly as for the admin panel.
 *
 * SEPARATION FROM THE ADMIN PANEL — unchanged and load-bearing:
 * this module only ever touches `/api/auth/customer/*` and the customer
 * cookie. The two sessions use different cookies AND different token audience
 * claims, so an admin session can never make the storefront think a customer
 * is signed in, and a customer session can never satisfy an admin guard.
 *
 * SCOPE: accounts only. No orders, no order history, no addresses — those are
 * Stage 6. Signing out never clears the cart, which belongs to the browser.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

let currentCustomer: CustomerAccount | null = null;
let initialised = false;

function emit() {
  listeners.forEach((listener) => listener());
}

export interface CustomerCredentials {
  email: string;
  password: string;
}

export interface CustomerRegistration extends CustomerCredentials {
  name: string;
}

export const customerAccountService = {
  /** Resolves the session from the server cookie. Called once on mount. */
  async restore(): Promise<CustomerAccount | null> {
    try {
      currentCustomer = await api.get<CustomerAccount | null>('/auth/customer/me');
    } catch {
      currentCustomer = null;
    }
    initialised = true;
    emit();
    return currentCustomer;
  },

  getSession(): CustomerSessionState {
    return {
      customer: currentCustomer,
      isAuthenticated: currentCustomer !== null,
      // Customer authentication is now implemented.
      isEnabled: true,
    };
  },

  isAuthenticated(): boolean {
    return currentCustomer !== null;
  },

  getCurrentCustomer(): CustomerAccount | null {
    return currentCustomer;
  },

  isEnabled(): boolean {
    return true;
  },

  hasRestored(): boolean {
    return initialised;
  },

  async signIn(credentials: CustomerCredentials): Promise<CustomerAccount> {
    const customer = await api.post<CustomerAccount>('/auth/customer/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    currentCustomer = customer;
    initialised = true;
    emit();
    return customer;
  },

  async register(input: CustomerRegistration): Promise<CustomerAccount> {
    const customer = await api.post<CustomerAccount>('/auth/customer/register', {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    currentCustomer = customer;
    initialised = true;
    emit();
    return customer;
  },

  /** Ends the customer session. Never clears the cart. */
  async signOut(): Promise<void> {
    try {
      await api.post<null>('/auth/customer/logout');
    } finally {
      currentCustomer = null;
      emit();
    }
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
