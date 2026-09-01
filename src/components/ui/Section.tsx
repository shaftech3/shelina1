import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionProps {
  children: ReactNode;
  className?: string;
  tone?: 'surface' | 'cream';
  /** Vertical rhythm; `tight` for stacked rows, `loose` for editorial breaks. */
  spacing?: 'tight' | 'default' | 'loose';
  id?: string;
  'aria-labelledby'?: string;
}

const SPACING = {
  tight: 'py-6 md:py-8',
  default: 'py-8 sm:py-10 md:py-14',
  loose: 'py-12 md:py-16 xl:py-20',
} as const;

/** Page band providing vertical rhythm and optional cream background. */
export function Section({ children, className, tone = 'surface', spacing = 'default', ...rest }: SectionProps) {
  return (
    <section
      className={cn(tone === 'cream' ? 'bg-cream' : 'bg-background', SPACING[spacing], className)}
      {...rest}
    >
      {children}
    </section>
  );
}
