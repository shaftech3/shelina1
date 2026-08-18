import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  /** Heading level — keeps the document outline correct per page. */
  as?: 'h1' | 'h2' | 'h3';
}

/** Consistent section intro block used across every marketing row. */
export function SectionHeader({
  title,
  eyebrow,
  description,
  action,
  align = 'left',
  className,
  as: Heading = 'h2',
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'left' ? 'sm:flex-row sm:items-end sm:justify-between' : 'items-center text-center',
        className,
      )}
    >
      <div className={cn('flex max-w-2xl flex-col gap-2.5', align === 'center' && 'items-center')}>
        {eyebrow && <span className="eyebrow text-primary-deep">{eyebrow}</span>}
        <Heading className="text-h2">{title}</Heading>
        {description && <p className="text-body text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
