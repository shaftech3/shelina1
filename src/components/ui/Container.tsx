import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** `wide` relaxes the max width for full-bleed editorial rows. */
  size?: 'default' | 'wide' | 'narrow';
}

/** The single source of horizontal rhythm — page gutters live only here. */
export function Container({ children, className, as: Tag = 'div', size = 'default' }: ContainerProps) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full px-gutter',
        size === 'default' && 'max-w-container',
        size === 'wide' && 'max-w-[1680px]',
        size === 'narrow' && 'max-w-[880px]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
