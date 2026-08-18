import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useScrollReveal } from '@/hooks';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger in milliseconds — keep sequences short (<= ~240ms total). */
  delay?: number;
  as?: ElementType;
  threshold?: number;
}

/**
 * Declarative scroll-reveal wrapper.
 * Animation is pure CSS on transform + opacity; `prefers-reduced-motion`
 * neutralises it via the `.reveal` rule in index.css.
 */
export function Reveal({ children, className, delay = 0, as: Tag = 'div', threshold }: RevealProps) {
  const { ref, revealed } = useScrollReveal<HTMLElement>({ threshold });

  return (
    <Tag
      ref={ref}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
      className={cn('reveal', revealed && 'is-revealed', className)}
    >
      {children}
    </Tag>
  );
}
