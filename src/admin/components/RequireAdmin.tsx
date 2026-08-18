import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { useAdminAuth } from '../auth';

/**
 * Route guard for every /admin route except the login page.
 *
 * ⚠️  THIS IS A UX CONVENIENCE, NOT A SECURITY BOUNDARY.
 * It hides screens from someone who has not signed in. It cannot protect data:
 * all of this runs in the browser, and the mock repository is readable from
 * devtools regardless. Real protection requires the Stage 5 backend to
 * authenticate every request and authorise every mutation server-side.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, initialising } = useAdminAuth();
  const location = useLocation();

  // Never decide before the session check finishes, or a refresh on a guarded
  // route would bounce an authenticated admin to the login screen.
  if (initialising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Spinner />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // `state.from` lets the login page return the admin to where they were
    // headed instead of always dumping them on the dashboard.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
