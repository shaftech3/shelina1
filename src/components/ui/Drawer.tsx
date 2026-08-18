import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useFocusTrap, useLockBodyScroll } from '@/hooks';
import { IconButton } from './IconButton';
import { Icon } from './Icon';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'left' | 'right';
  footer?: ReactNode;
  className?: string;
}

const EXIT_MS = 240;

/**
 * Slide-over panel used for mobile navigation and (later) the cart.
 * Handles focus trapping, body-scroll lock, Escape and an exit animation.
 */
export function Drawer({ open, onClose, title, children, side = 'right', footer, className }: DrawerProps) {
  const [mounted, setMounted] = useState(open);
  const containerRef = useFocusTrap<HTMLDivElement>(open, onClose);

  useLockBodyScroll(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title ?? 'Panel'}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className={cn(
          'absolute inset-0 h-full w-full cursor-default bg-ink/35 backdrop-blur-[2px] transition-opacity duration-base ease-elegant',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        ref={containerRef}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex w-[min(92vw,400px)] flex-col bg-surface shadow-lg outline-none',
          'transition-transform duration-base ease-elegant motion-reduce:transition-none',
          side === 'right' ? 'right-0' : 'left-0',
          open ? 'translate-x-0' : side === 'right' ? 'translate-x-full' : '-translate-x-full',
          className,
        )}
      >
        <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between gap-4 border-b border-border px-5">
          {title ? (
            <span className="font-display text-h4 text-ink">{title}</span>
          ) : (
            <span />
          )}
          <IconButton label="Close panel" icon={<Icon name="close" size={20} />} onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">{children}</div>

        {footer && <div className="shrink-0 border-t border-border bg-cream px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
