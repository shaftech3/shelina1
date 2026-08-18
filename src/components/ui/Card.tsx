import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** `editorial` uses the larger fashion-style radius. */
  radius?: 'md' | 'lg' | 'editorial';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'surface' | 'cream';
  interactive?: boolean;
}

const PADDING = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8 sm:p-10' } as const;
const RADIUS = { md: 'rounded-md', lg: 'rounded-lg', editorial: 'rounded-xl sm:rounded-2xl' } as const;

/** Neutral surface primitive that other cards compose on top of. */
export function Card({
  children,
  className,
  radius = 'lg',
  padding = 'md',
  tone = 'surface',
  interactive = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'border border-border',
        tone === 'surface' ? 'bg-surface' : 'bg-cream',
        RADIUS[radius],
        PADDING[padding],
        interactive &&
          'transition-[box-shadow,transform,border-color] duration-base ease-elegant motion-safe:hover:-translate-y-1 hover:border-border-strong hover:shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}
