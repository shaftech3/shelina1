import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error' | 'dark';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  size?: 'sm' | 'md';
}

const TONES: Record<BadgeTone, string> = {
  // primary-deep: badge text is small, so it needs the 4.5:1 fill.
  primary: 'bg-primary-deep text-white',
  secondary: 'bg-secondary text-ink',  // white on #D29E9E is only 2.3:1; ink gives 7:1
  neutral: 'bg-cream text-ink-muted ring-1 ring-inset ring-border',
  // Badge text is 10-11px, so it must clear 4.5:1 against its OWN tint, not
  // against white. The base hues only reach ~4.0:1 there; -deep fixes that.
  success: 'bg-success/12 text-success-deep ring-1 ring-inset ring-success/25',
  warning: 'bg-warning/12 text-warning-deep ring-1 ring-inset ring-warning/25',
  error: 'bg-error/10 text-error-deep ring-1 ring-inset ring-error/25',
  dark: 'bg-ink text-cream',
};

/** Small emphatic status marker — sale %, "New", stock state. */
export function Badge({ children, tone = 'primary', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-sans font-semibold uppercase tracking-[0.08em]',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
