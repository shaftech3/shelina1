import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useFocusTrap, useLockBodyScroll } from '@/hooks';
import { Container, Icon, IconButton, Input, SmartLink } from '@/components/ui';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Search UI foundation.
 *
 * Stage 2 is deliberately presentation-only: the input is inert, no query runs,
 * no API is called and no suggestions are computed. The suggestion chips below
 * are static navigation shortcuts, not search results.
 *
 * Stage 3 replaces the body of this panel with real querying — the overlay
 * shell, focus handling and animation stay as-is.
 */
export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [mounted, setMounted] = useState(open);
  const containerRef = useFocusTrap<HTMLDivElement>(open, onClose);

  useLockBodyScroll(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[105]" role="dialog" aria-modal="true" aria-label="Search">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className={cn(
          'absolute inset-0 h-full w-full cursor-default bg-ink/35 backdrop-blur-[2px]',
          'transition-opacity duration-base ease-elegant',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        ref={containerRef}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 top-0 border-b border-border bg-surface shadow-lg outline-none',
          'transition-transform duration-base ease-elegant motion-reduce:transition-none',
          open ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <Container>
          <div className="flex flex-col gap-5 py-6 sm:py-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-h4 text-ink">Search</h2>
              <IconButton label="Close search" icon={<Icon name="close" size={20} />} onClick={onClose} />
            </div>

            <Input
              type="search"
              placeholder="Search products..."
              aria-label="Search products"
              iconLeft={<Icon name="search" size={19} />}
              className="h-14"
            />

            <div className="flex flex-col gap-2.5">
              <span className="text-caption uppercase tracking-[0.14em] text-ink-subtle">
                Popular categories
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Ladies chappals', href: '/category/ladies-chappals' },
                  { label: 'Gents shoes', href: '/category/gents-shoes' },
                  { label: 'Sneakers', href: '/category/sneakers' },
                  { label: 'New arrivals', href: '/new-arrivals' },
                ].map((item) => (
                  <SmartLink
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-2',
                      'text-caption font-medium text-ink-muted transition-colors duration-fast ease-elegant',
                      'hover:border-primary/50 hover:text-primary-deep',
                      'focus-visible:outline-none focus-visible:shadow-focus',
                    )}
                  >
                    {item.label}
                  </SmartLink>
                ))}
              </div>
            </div>

            <p className="text-caption text-ink-subtle">
              Product search is coming soon.
            </p>
          </div>
        </Container>
      </div>
    </div>,
    document.body,
  );
}
