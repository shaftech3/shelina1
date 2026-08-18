import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Receives the wiring a control needs to stay accessible. */
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
    'aria-required'?: boolean;
  }) => ReactNode;
}

/**
 * Shared label / hint / error scaffold.
 * Every form control composes this so accessibility wiring is written once.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-label font-medium text-ink">
          {label}
          {required && (
            <span className="ml-1 text-secondary-deep" aria-hidden>
              *
            </span>
          )}
        </label>
      )}

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-caption text-ink-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Shared visual treatment for text-like controls. */
export const controlClasses = (invalid?: boolean, className?: string) =>
  cn(
    'w-full rounded-md border bg-surface px-4 text-body-sm text-ink placeholder:text-ink-subtle',
    'transition-[border-color,box-shadow] duration-fast ease-elegant',
    'focus:outline-none focus:border-primary focus:shadow-focus',
    'disabled:cursor-not-allowed disabled:bg-cream disabled:text-ink-subtle',
    invalid ? 'border-error' : 'border-border hover:border-border-strong',
    className,
  );
