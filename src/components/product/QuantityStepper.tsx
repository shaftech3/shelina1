import { useId } from 'react';
import { cn } from '@/lib/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** Usually the product's remaining stock. */
  max?: number;
  /** Compact variant used inside cart lines. */
  size?: 'sm' | 'md';
  className?: string;
  /** Accessible name; defaults to a generic label. */
  label?: string;
}
/**
 * Accessible quantity control.
 *
 * The visible number is a real `<input type="number">` so it can be typed into
 * and is announced properly, but every value is clamped on the way through —
 * negatives, zero, text and out-of-range entries are impossible to commit.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = 'md',
  className,
  label = 'Quantity',
}: QuantityStepperProps) {
  const inputId = useId();
  const ceiling = max && max > 0 ? max : undefined;
  const clamp = (next: number) => {
    if (!Number.isFinite(next)) return min;
    const floored = Math.floor(next);
    if (floored < min) return min;
    if (ceiling !== undefined && floored > ceiling) return ceiling;
    return floored;
  };
  const atMin = value <= min;
  const atMax = ceiling !== undefined && value >= ceiling;
  const buttonClasses = cn(
    'inline-flex shrink-0 items-center justify-center text-ink transition-colors duration-fast',
    'hover:bg-cream focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent',
    size === 'sm' ? 'h-9 w-9' : 'h-12 w-12',
  );
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className={size === 'sm' ? 'sr-only' : 'text-label font-medium text-ink'}>
        {label}
      </label>
      <div
        className={cn(
          'inline-flex w-fit items-center overflow-hidden rounded-md border border-border bg-surface',
          size === 'sm' ? 'h-9' : 'h-12',
        )}
      >
        <button
          type="button"
          className={buttonClasses}
          onClick={() => onChange(clamp(value - 1))}
          disabled={atMin}
          aria-label="Decrease quantity"
        >
          <span aria-hidden className="text-body-lg leading-none">
            −
          </span>
        </button>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={ceiling}
          // Commit on change for keyboard/typed entry, and clamp again on blur
          // so a transient empty field can't leave the control in a bad state.
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (event.target.value === '') return;
            onChange(clamp(parsed));
          }}
          onBlur={(event) => onChange(clamp(Number(event.target.value)))}
          aria-label={label}
          className={cn(
            'h-full border-x border-border bg-surface text-center font-medium text-ink',
            'focus-visible:outline-none focus-visible:bg-cream',
            // Native spinners would duplicate our own buttons.
            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            size === 'sm' ? 'w-10 text-caption' : 'w-14 text-body-sm',
          )}
        />
        <button
          type="button"
          className={buttonClasses}
          onClick={() => onChange(clamp(value + 1))}
          disabled={atMax}
          aria-label="Increase quantity"
        >
          <span aria-hidden className="text-body-lg leading-none">
            +
          </span>
        </button>
      </div>
      {atMax && ceiling !== undefined && (
        <span className="text-caption text-ink-muted" role="status">
          Only {ceiling} left in stock.
        </span>
      )}
    </div>
  );
}
