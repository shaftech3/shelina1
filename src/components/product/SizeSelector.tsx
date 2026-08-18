import { cn } from '@/lib/cn';
import type { ProductSize } from '@/types';

interface SizeSelectorProps {
  /**
   * Comes straight off the product. Whatever strings the admin typed are what
   * render here — "38", "UK 9", "Large", "Free Size". This component never
   * consults, generates, or validates against any size list, because none
   * exists in this codebase.
   */
  sizes: ProductSize[];
  selected: string | null;
  onSelect: (value: string) => void;
  /** Set after a failed Add to Cart so the group can announce the problem. */
  invalid?: boolean;
  errorId?: string;
  className?: string;
}

export function SizeSelector({
  sizes,
  selected,
  onSelect,
  invalid = false,
  errorId,
  className,
}: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span id="size-label" className="text-label font-medium text-ink">
          Size
        </span>
        {selected && (
          <span className="text-caption text-ink-muted">
            Selected: <span className="font-medium text-ink">{selected}</span>
          </span>
        )}
      </div>

      {/* radiogroup rather than buttons: this is a single-choice control, so
          arrow-key semantics and a group-level invalid state come for free. */}
      <div
        role="radiogroup"
        aria-labelledby="size-label"
        aria-invalid={invalid || undefined}
        aria-errormessage={invalid && errorId ? errorId : undefined}
        className="flex flex-wrap gap-2"
      >
        {sizes.map((size) => {
          const isSelected = selected === size.value;
          const disabled = !size.available;

          return (
            <button
              key={size.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(size.value)}
              className={cn(
                'relative inline-flex min-w-[3.25rem] items-center justify-center rounded-md border px-3.5 py-2.5',
                'text-body-sm font-medium transition-[background-color,border-color,color] duration-fast ease-elegant',
                'focus-visible:outline-none focus-visible:shadow-focus',
                // Selection is signalled by border weight AND fill AND the
                // "Selected:" text above — never by colour alone.
                isSelected
                  ? 'border-ink bg-ink text-white'
                  : 'border-border bg-surface text-ink hover:border-border-strong hover:bg-cream',
                disabled &&
                  'cursor-not-allowed border-border bg-cream text-ink-subtle hover:border-border hover:bg-cream',
              )}
            >
              {size.value}
              {disabled && (
                <>
                  {/* Diagonal rule marks unavailability without relying on colour. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-2 top-1/2 h-px -rotate-[18deg] bg-ink-subtle/70"
                  />
                  <span className="sr-only">(unavailable)</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
