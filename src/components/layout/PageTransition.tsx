import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Route transition + scroll restoration.
 *
 * A short opacity/translate fade keyed on pathname. Content is rendered
 * immediately and the animation only plays *in* — navigation is never blocked
 * or delayed waiting for an exit animation. Reduced motion collapses the
 * duration to ~0 via the global token contract.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div key={pathname} className="motion-safe:animate-[fade-up_var(--dur-base)_var(--ease-entrance)_both]">
      {children}
    </div>
  );
}
