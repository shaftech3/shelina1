import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses, Field } from './Field';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, iconLeft, iconRight, className, wrapperClassName, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(fieldProps) => (
        <div className="relative">
          {iconLeft && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            {...fieldProps}
            {...rest}
            className={controlClasses(
              Boolean(error),
              cn('h-12', iconLeft && 'pl-11', iconRight && 'pr-11', className),
            )}
          />
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {iconRight}
            </div>
          )}
        </div>
      )}
    </Field>
  );
});
