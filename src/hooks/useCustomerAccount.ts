import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { customerAccountService } from '@/services';
import type { CustomerAccount } from '@/types';

/**
 * Customer session state for the storefront.
 *
 * The session itself is an HttpOnly cookie the browser cannot read, so the
 * source of truth is the server. `customerAccountService` caches the answer
 * and notifies subscribers; this hook exposes it to React.
 *
 * Completely independent of `useAdminAuth`. They read different services,
 * different cookies and different endpoints — an admin session never makes
 * this report a signed-in customer.
 */
export interface CustomerAccountState {
  customer: CustomerAccount | null;
  isAuthenticated: boolean;
  /** True until the initial `/auth/customer/me` call resolves. */
  initialising: boolean;
  signOut: () => Promise<void>;
}

export function useCustomerAccount(): CustomerAccountState {
  const customer = useSyncExternalStore(
    customerAccountService.subscribe,
    customerAccountService.getCurrentCustomer,
    () => null,
  );

  const restored = useSyncExternalStore(
    customerAccountService.subscribe,
    customerAccountService.hasRestored,
    () => false,
  );

  // Resolve the session once per app load.
  useEffect(() => {
    if (!customerAccountService.hasRestored()) {
      void customerAccountService.restore();
    }
  }, []);

  const signOut = useCallback(async () => {
    await customerAccountService.signOut();
  }, []);

  return {
    customer,
    isAuthenticated: customer !== null,
    initialising: !restored,
    signOut,
  };
}
