import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/** CSS-positioned tooltip; exposed to assistive tech via aria-describedby. */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5',
          'text-center text-caption text-cream shadow-md',
          'transition-[opacity,transform] duration-fast ease-elegant',
          side === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]',
          visible ? 'opacity-100' : 'opacity-0',
          visible ? 'translate-y-0' : side === 'top' ? 'translate-y-1' : '-translate-y-1',
        )}
      >
        {content}
      </span>
    </span>
  );
}
