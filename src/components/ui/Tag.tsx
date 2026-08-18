import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TagProps {
  children: ReactNode;
  className?: string;
  /** Renders as a removable/selectable chip when interactive. */
  onClick?: () => void;
  active?: boolean;
}

/** Low-emphasis descriptor chip (filters, attributes, editorial labels). */
export function Tag({ children, className, onClick, active = false }: TagProps) {
  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium',
    'transition-colors duration-fast ease-elegant',
    active
      ? 'border-primary bg-primary-soft text-primary-deep'
      : 'border-border bg-surface text-ink-muted',
    onClick && 'hover:border-primary/50 hover:text-primary-deep focus-visible:outline-none focus-visible:shadow-focus',
    className,
  );

  if (!onClick) return <span className={base}>{children}</span>;

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={base}>
      {children}
    </button>
  );
}
