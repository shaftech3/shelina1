import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SmartLink } from './SmartLink';

interface DropdownProps {
  /** Render-prop trigger so the caller controls the button's appearance. */
  trigger: (props: { open: boolean; toggle: () => void; id: string; controls: string }) => ReactNode;
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Opens on pointer hover as well as click (desktop mega-menus). */
  openOnHover?: boolean;
}

/** Lightweight popover. Closes on outside click, Escape and focus loss. */
export function Dropdown({ trigger, children, align = 'left', className, openOnHover = false }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const triggerId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const hoverProps = openOnHover
    ? {
        onPointerEnter: () => {
          window.clearTimeout(closeTimer.current);
          setOpen(true);
        },
        onPointerLeave: () => {
          closeTimer.current = window.setTimeout(() => setOpen(false), 120);
        },
      }
    : {};

  return (
    <div
      ref={rootRef}
      className="relative"
      onFocus={openOnHover ? () => setOpen(true) : undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
      {...hoverProps}
    >
      {trigger({ open, toggle: () => setOpen((value) => !value), id: triggerId, controls: panelId })}

      <div
        id={panelId}
        role="menu"
        aria-labelledby={triggerId}
        hidden={!open}
        className={cn(
          'absolute top-[calc(100%+10px)] z-50 min-w-[240px] rounded-lg border border-border bg-surface p-2 shadow-md',
          'origin-top transition-[opacity,transform] duration-fast ease-entrance motion-reduce:transition-none',
          open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0',
          align === 'left' && 'left-0',
          align === 'right' && 'right-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  description?: string;
}

export function DropdownItem({ children, href, onClick, description }: DropdownItemProps) {
  const classes = cn(
    'flex w-full flex-col gap-0.5 rounded-md px-3.5 py-2.5 text-left transition-colors duration-fast ease-elegant',
    'hover:bg-cream focus-visible:outline-none focus-visible:bg-cream',
  );

  const content = (
    <>
      <span className="text-body-sm font-medium text-ink">{children}</span>
      {description && <span className="text-caption text-ink-subtle">{description}</span>}
    </>
  );

  if (href) {
    return (
      <SmartLink href={href} role="menuitem" className={classes}>
        {content}
      </SmartLink>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
