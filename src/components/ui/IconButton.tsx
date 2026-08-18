import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — icon-only controls must expose an accessible name. */
  label: string;
  icon: ReactNode;
  variant?: 'plain' | 'soft' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  /** Optional numeric indicator, e.g. cart count. */
  badgeCount?: number;
}

const VARIANTS = {
  plain: 'text-ink hover:bg-cream active:bg-surface-alt',
  soft: 'bg-cream text-ink hover:bg-primary-soft active:bg-primary-soft/70',
  outline: 'border border-border text-ink hover:border-border-strong hover:bg-cream',
} as const;

const SIZES = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'plain', size = 'md', badgeCount, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full',
        'transition-[background-color,border-color,transform,color] duration-fast ease-elegant',
        'motion-safe:active:scale-[0.94] focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:text-ink-subtle',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-deep px-1 text-[10px] font-semibold leading-none text-white"
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
});
