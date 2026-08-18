import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'light' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Shared between <Button> and <ButtonLink> so both stay visually identical. */
export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // primary-deep fill, not primary: white on #2596BE is 3.40:1 and button labels
  // are normal-size text, so they need 4.5:1. Rest 5.68:1, hover 4.87:1.
  primary:
    'bg-primary-deep text-white shadow-sm hover:bg-primary-hover hover:shadow active:shadow-xs disabled:bg-primary-deep/45',
  // Ink label rather than white: white on #D29E9E is 2.3:1 and fails WCAG AA.
  secondary:
    'bg-secondary text-ink shadow-sm hover:bg-secondary-hover hover:text-white hover:shadow active:shadow-xs disabled:bg-secondary/45',
  light:
    'bg-surface text-ink shadow-ring hover:bg-cream hover:shadow-sm active:bg-surface-alt disabled:text-ink-subtle',
  // Label uses primary-deep (5.68:1 on white) rather than primary (3.40:1).
  outline:
    'border border-primary/45 bg-transparent text-primary-deep hover:border-primary hover:bg-primary-soft active:bg-primary-soft/70 disabled:border-border disabled:text-ink-subtle',
  ghost: 'bg-transparent text-ink hover:bg-cream active:bg-surface-alt disabled:text-ink-subtle',
  // Destructive confirmation only. White on #BE4444 is 5.6:1, comfortably AA
  // for a normal-size button label.
  danger:
    'bg-error text-white shadow-sm hover:bg-error-hover hover:shadow active:shadow-xs disabled:bg-error/45',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-caption gap-1.5',
  md: 'h-12 px-6 text-button gap-2',
  lg: 'h-14 px-8 text-button gap-2.5 sm:px-9',
};

export function buttonClasses(variant: ButtonVariant, size: ButtonSize, fullWidth = false): string {
  return cn(
    'relative inline-flex select-none items-center justify-center rounded-full font-sans font-medium no-underline',
    'transition-[background-color,color,border-color,box-shadow,transform] duration-fast ease-elegant',
    'motion-safe:active:translate-y-px focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:cursor-not-allowed disabled:shadow-none',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    fullWidth && 'w-full',
  );
}
