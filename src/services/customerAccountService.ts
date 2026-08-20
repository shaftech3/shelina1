import type { CustomerAccount, CustomerSessionState } from '@/types';
import { api, setCustomerToken } from './apiClient';

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
 * JWT in an HttpOnly cookie + Bearer token header for cross-domain reliability.
 *
 * SEPARATION FROM THE ADMIN PANEL — unchanged and load-bearing:
 * this module only ever touches `/api/auth/customer/*` and the customer
 * cookie/token.
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
  /** Resolves the session from the server cookie / token. Called once on mount. */
  async restore(): Promise<CustomerAccount | null> {
    try {
      currentCustomer = await api.get<CustomerAccount | null>('/auth/customer/me');
    } catch {
      currentCustomer = null;
      setCustomerToken(null);
    }
    initialised = true;
    emit();
    return currentCustomer;
  },

  getSession(): CustomerSessionState {
    return {
      customer: currentCustomer,
      isAuthenticated: currentCustomer !== null,
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
    const response = await api.post<CustomerAccount & { token?: string }>('/auth/customer/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    if (response.token) {
      setCustomerToken(response.token);
    }
    const customer: CustomerAccount = {
      id: response.id,
      email: response.email,
      name: response.name,
    };
    currentCustomer = customer;
    initialised = true;
    emit();
    return customer;
  },

  async register(input: CustomerRegistration): Promise<CustomerAccount> {
    const response = await api.post<CustomerAccount & { token?: string }>('/auth/customer/register', {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (response.token) {
      setCustomerToken(response.token);
    }
    const customer: CustomerAccount = {
      id: response.id,
      email: response.email,
      name: response.name,
    };
    currentCustomer = customer;
    initialised = true;
    emit();
    return customer;
  },

  /** Ends the customer session. Never clears the cart. */
  async signOut(): Promise<void> {
    try {
      await api.post<null>('/auth/customer/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setCustomerToken(null);
      currentCustomer = null;
      emit();
    }
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
