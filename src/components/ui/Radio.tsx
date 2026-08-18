import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, hint, className, id: idProp, ...rest },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
        <input
          ref={ref}
          id={id}
          type="radio"
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-strong bg-surface',
            'transition-[border-color] duration-fast ease-elegant',
            'peer-checked:border-primary peer-focus-visible:shadow-focus peer-disabled:bg-cream',
            'peer-checked:[&>span]:scale-100',
          )}
        >
          <span className="h-2.5 w-2.5 scale-0 rounded-full bg-primary transition-transform duration-fast ease-elegant" />
        </span>
      </span>
      <span className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer text-body-sm text-ink">
          {label}
        </label>
        {hint && <span className="text-caption text-ink-subtle">{hint}</span>}
      </span>
    </div>
  );
});

interface RadioGroupProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
  /** Visually hides the legend while keeping it for screen readers. */
  hideLegend?: boolean;
}

export function RadioGroup({ legend, children, className, hideLegend }: RadioGroupProps) {
  return (
    <fieldset className={cn('flex flex-col gap-3', className)}>
      <legend className={cn('text-label font-medium text-ink', hideLegend && 'sr-only')}>{legend}</legend>
      {children}
    </fieldset>
  );
}
