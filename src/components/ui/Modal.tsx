import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useFocusTrap, useLockBodyScroll } from '@/hooks';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' } as const;
const EXIT_MS = 200;

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const containerRef = useFocusTrap<HTMLDivElement>(open, onClose);
  const titleId = useId();
  const descId = useId();

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
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className={cn(
          'absolute inset-0 h-full w-full cursor-default bg-ink/40 transition-opacity duration-base ease-elegant',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl bg-surface shadow-lg outline-none sm:rounded-xl',
          'transition-[opacity,transform] duration-base ease-entrance motion-reduce:transition-none',
          open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-6 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-h4 text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-body-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" icon={<Icon name="close" size={20} />} onClick={onClose} size="sm" />
        </div>

        {children && <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>}
        {footer && <div className="flex justify-end gap-3 border-t border-border bg-cream px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
