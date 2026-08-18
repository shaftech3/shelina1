import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * One titled block of a long admin form (§45).
 *
 * Uses a real <section> + <h2> so the form has a navigable heading structure
 * for screen readers rather than a flat wall of inputs.
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn('rounded-lg border border-border bg-surface p-5 sm:p-6', className)}>
      <div className="mb-5">
        <h2 className="text-h4 text-ink">{title}</h2>
        {description && <p className="mt-1 text-caption text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
