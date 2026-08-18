import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, error, className, id: idProp, ...rest },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = hint || error ? `${id}-desc` : undefined;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-describedby={hintId}
            aria-invalid={error ? true : undefined}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...rest}
          />
          <span
            aria-hidden
            className={cn(
              'pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-xs border bg-surface',
              'transition-[background-color,border-color] duration-fast ease-elegant',
              'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white',
              'peer-focus-visible:shadow-focus peer-disabled:bg-cream',
              'peer-checked:[&>svg]:opacity-100',
              error ? 'border-error' : 'border-border-strong',
            )}
          >
            <Icon name="check" size={13} strokeWidth={2.6} className="opacity-0 transition-opacity duration-fast" />
          </span>
        </span>
        <label htmlFor={id} className="cursor-pointer text-body-sm text-ink">
          {label}
        </label>
      </div>
      {(error || hint) && (
        <p id={hintId} className={cn('pl-8 text-caption', error ? 'text-error' : 'text-ink-subtle')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
